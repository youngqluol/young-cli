const path = require('path')
const inquirer = require('inquirer')
const EventEmitter = require('events')
const Generator = require('./Generator')
const sortObject = require('./util/sortObject')
const PackageManager = require('./util/ProjectPackageManager')
const { clearConsole } = require('./util/clearConsole')
const PromptModuleAPI = require('./PromptModuleAPI')
const writeFileTree = require('./util/writeFileTree')
const { formatFeatures } = require('./util/features')
const loadLocalPreset = require('./util/loadLocalPreset')
const loadRemotePreset = require('./util/loadRemotePreset')
const generateReadme = require('./util/generateReadme')
const { resolvePkg, isOfficialPlugin } = require('@vue/cli-shared-utils')

const {
  defaults,
  saveOptions,
  loadOptions,
  savePreset,
  validatePreset,
  rcPath,
} = require('./options')

const {
  chalk,
  execa,
  log,
  error,
  hasYarn,
  exit,
  loadModule
} = require('young-common-utils')

const isManualMode = (answers) => answers.preset === '__manual__'

module.exports = class Creator extends EventEmitter {
  constructor(name, context, promptModules) {
    super()

    this.name = name
    this.context = context
    const { presetPrompt, featurePrompt } = this.resolveIntroPrompts()

    this.presetPrompt = presetPrompt
    this.featurePrompt = featurePrompt
    this.outroPrompts = this.resolveOutroPrompts()
    this.injectedPrompts = []
    this.promptCompleteCbs = []
    this.afterInvokeCbs = []
    this.afterAnyInvokeCbs = []

    this.run = this.run.bind(this)

    const promptAPI = new PromptModuleAPI(this)
    promptModules.forEach((m) => m(promptAPI))
  }

  async create() {
    const { run, name, context, afterInvokeCbs, afterAnyInvokeCbs } = this

    const preset = await this.promptAndResolvePreset()

    // inject core service
    preset.plugins['young-cli-service'] = Object.assign(
      {
        projectName: name,
      },
      preset,
    )

    // legacy support for router
    if (preset.router) {
      preset.plugins['young-cli-plugin-router'] = {}

      if (preset.routerHistoryMode) {
        preset.plugins['young-cli-plugin-router'].historyMode = true
      }
    }

    // legacy support for vuex
    if (preset.vuex) {
      preset.plugins['young-cli-plugin-vuex'] = {}
    }

    const packageManager =
      loadOptions().packageManager || (hasYarn() ? 'yarn' : null) || 'npm'

    await clearConsole()
    const pm = new PackageManager({
      context,
      forcePackageManager: packageManager,
    })

    log(`✨  Creating project in ${chalk.yellow(context)}.`)

    // generate package.json with plugin dependencies
    const pkg = {
      name,
      version: '0.1.0',
      private: true,
      devDependencies: {},
      ...resolvePkg(context),
    }
    const deps = Object.keys(preset.plugins)
    deps.forEach((dep) => {
      let { version } = preset.plugins[dep]

      if (!version) {
        version = '~1.0.0'
      }

      pkg.devDependencies[dep] = version
    })

    // write package.json
    await writeFileTree(context, {
      'package.json': JSON.stringify(pkg, null, 2),
    })

    // install plugins
    log(`⚙\u{fe0f}  Installing CLI plugins. This might take a while...`)
    log()

    await pm.install()

    // run generator
    log(`🚀  Invoking generators...`)
    const plugins = await this.resolvePlugins(preset.plugins, pkg)
    const generator = new Generator(context, {
      pkg,
      plugins,
      afterInvokeCbs,
      afterAnyInvokeCbs,
    })
    await generator.generate({
      extractConfigFiles: preset.useConfigFiles,
    })

    // install additional deps (injected by generators)
    log(`📦  Installing additional dependencies...`)
    log()

    await pm.install()

    // run complete cbs if any (injected by generators)
    log(`⚓  Running completion hooks...`)
    for (const cb of afterInvokeCbs) {
      await cb()
    }
    for (const cb of afterAnyInvokeCbs) {
      await cb()
    }

    if (!generator.files['README.md']) {
      // generate README.md
      log()
      log('📄  Generating README.md...')
      await writeFileTree(context, {
        'README.md': generateReadme(generator.pkg, packageManager),
      })
    }

    // log instructions
    log()
    log(`🎉  Successfully created project ${chalk.yellow(name)}.`)
    log(
      `👉  Get started with the following commands:\n\n` +
        (this.context === process.cwd()
          ? ``
          : chalk.cyan(` ${chalk.gray('$')} cd ${name}\n`)) +
        chalk.cyan(
          ` ${chalk.gray('$')} ${
            packageManager === 'yarn' ? 'yarn serve' : 'npm run serve'
          }`,
        ),
    )
    log()

    generator.printExitLogs()
  }

  run(command, args) {
    if (!args) {
      ;[command, ...args] = command.split(/\s+/)
    }
    return execa(command, args, { cwd: this.context })
  }

  async promptAndResolvePreset(answers = null) {
    // prompt
    if (!answers) {
      await clearConsole(true)
      answers = await inquirer.prompt(this.resolveFinalPrompts())
    }

    if (answers.packageManager) {
      saveOptions({
        packageManager: answers.packageManager,
      })
    }

    let preset
    if (answers.preset && answers.preset !== '__manual__') {
      preset = await this.resolvePreset(answers.preset)
    } else {
      // manual
      preset = {
        useConfigFiles: answers.useConfigFiles === 'files',
        plugins: {},
      }
      answers.features = answers.features || []
      // run cb registered by prompt modules to finalize the preset
      this.promptCompleteCbs.forEach((cb) => cb(answers, preset))
    }

    // validate
    validatePreset(preset)

    // save preset
    if (
      answers.save &&
      answers.saveName &&
      savePreset(answers.saveName, preset)
    ) {
      log()
      log(
        `🎉  Preset ${chalk.yellow(answers.saveName)} saved in ${chalk.yellow(
          rcPath,
        )}`,
      )
    }

    return preset
  }

  async resolvePreset(name, clone) {
    let preset
    const savedPresets = this.getPresets()

    if (name in savedPresets) {
      preset = savedPresets[name]
    } else if (
      name.endsWith('.json') ||
      /^\./.test(name) ||
      path.isAbsolute(name)
    ) {
      preset = await loadLocalPreset(path.resolve(name))
    } else if (name.includes('/')) {
      log(`Fetching remote preset ${chalk.cyan(name)}...`)
      try {
        preset = await loadRemotePreset(name, clone)
      } catch (e) {
        error(`Failed fetching remote preset ${chalk.cyan(name)}:`)
        throw e
      }
    }

    if (!preset) {
      error(`preset "${name}" not found.`)
      const presets = Object.keys(savedPresets)
      if (presets.length) {
        log()
        log(`available presets:\n${presets.join(`\n`)}`)
      } else {
        log(`you don't seem to have any saved preset.`)
        log(`run vue-cli in manual mode to create a preset.`)
      }
      exit(1)
    }
    return preset
  }

  // { id: options } => [{ id, apply, options }]
  async resolvePlugins(rawPlugins, pkg) {
    // ensure cli-service is invoked first
    rawPlugins = sortObject(rawPlugins, ['@vue/cli-service'], true)
    const plugins = []
    for (const id of Object.keys(rawPlugins)) {
      const apply = loadModule(`${id}/generator`, this.context) || (() => {})
      let options = rawPlugins[id] || {}

      if (options.prompts) {
        let pluginPrompts = loadModule(`${id}/prompts`, this.context)

        if (pluginPrompts) {
          const prompt = inquirer.createPromptModule()

          if (typeof pluginPrompts === 'function') {
            pluginPrompts = pluginPrompts(pkg, prompt)
          }
          if (typeof pluginPrompts.getPrompts === 'function') {
            pluginPrompts = pluginPrompts.getPrompts(pkg, prompt)
          }

          log()
          log(`${chalk.cyan(options._isPreset ? `Preset options:` : id)}`)
          options = await prompt(pluginPrompts)
        }
      }

      plugins.push({ id, apply, options })
    }
    return plugins
  }

  getPresets() {
    const savedOptions = loadOptions()
    return Object.assign({}, savedOptions.presets, defaults.presets)
  }

  resolveIntroPrompts() {
    const presets = this.getPresets()
    const presetChoices = Object.entries(presets).map(([name, preset]) => {
      let displayName = name
      if (name === 'default') {
        displayName = 'Default'
      } else if (name === '__default_vue_3__') {
        displayName = 'Default (Vue 3)'
      }

      return {
        name: `${displayName} (${formatFeatures(preset)})`,
        value: name,
      }
    })
    const presetPrompt = {
      name: 'preset',
      type: 'list',
      message: `Please pick a preset:`,
      choices: [
        ...presetChoices,
        {
          name: 'Manually select features',
          value: '__manual__',
        },
      ],
    }
    const featurePrompt = {
      name: 'features',
      when: isManualMode,
      type: 'checkbox',
      message: 'Check the features needed for your project:',
      choices: [],
      pageSize: 10,
    }
    return {
      presetPrompt,
      featurePrompt,
    }
  }

  resolveOutroPrompts() {
    const outroPrompts = [
      {
        name: 'useConfigFiles',
        when: isManualMode,
        type: 'list',
        message: 'Where do you prefer placing config for Babel, ESLint, etc.?',
        choices: [
          {
            name: 'In dedicated config files',
            value: 'files',
          },
          {
            name: 'In package.json',
            value: 'pkg',
          },
        ],
      },
      {
        name: 'save',
        when: isManualMode,
        type: 'confirm',
        message: 'Save this as a preset for future projects?',
        default: false,
      },
      {
        name: 'saveName',
        when: (answers) => answers.save,
        type: 'input',
        message: 'Save preset as:',
      },
    ]

    // ask for packageManager once
    const savedOptions = loadOptions()
    if (!savedOptions.packageManager && hasYarn()) {
      const packageManagerChoices = []

      if (hasYarn()) {
        packageManagerChoices.push({
          name: 'Use Yarn',
          value: 'yarn',
          short: 'Yarn',
        })
      }

      packageManagerChoices.push({
        name: 'Use NPM',
        value: 'npm',
        short: 'NPM',
      })

      outroPrompts.push({
        name: 'packageManager',
        type: 'list',
        message:
          'Pick the package manager to use when installing dependencies:',
        choices: packageManagerChoices,
      })
    }

    return outroPrompts
  }

  resolveFinalPrompts() {
    // patch generator-injected prompts to only show in manual mode
    this.injectedPrompts.forEach((prompt) => {
      const originalWhen = prompt.when || (() => true)
      prompt.when = (answers) => {
        return isManualMode(answers) && originalWhen(answers)
      }
    })

    const prompts = [
      this.presetPrompt,
      this.featurePrompt,
      ...this.injectedPrompts,
      ...this.outroPrompts,
    ]
    return prompts
  }
}
