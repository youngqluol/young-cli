const path = require('path')
const inquirer = require('inquirer')
const Generator = require('./Generator')
const sortObject = require('./util/sortObject')
const PackageManager = require('./util/ProjectPackageManager')
const PromptModuleAPI = require('./PromptModuleAPI')
const writeFileTree = require('./util/writeFileTree')
const { formatFeatures } = require('./util/features')
const getVersions = require('./util/getVersions')
const loadLocalPreset = require('./util/loadLocalPreset')
const loadRemotePreset = require('./util/loadRemotePreset')
const generateReadme = require('./util/generateReadme')

const {
  defaults,
  saveOptions,
  loadOptions,
  savePreset,
  rcPath,
} = require('./options')

const {
  chalk,
  execa,
  log,
  error,
  hasYarn,
  exit,
  loadModule,
  resolvePkg,
  clearConsole,
} = require('young-common-utils')

const isManualMode = (answers) => answers.preset === '__manual__'

module.exports = class Creator {
  constructor(name, context, promptModules) {
    this.name = name
    this.context = context
    const { presetPrompt, featurePrompt } = this.resolveIntroPrompts()

    this.presetPrompt = presetPrompt
    this.featurePrompt = featurePrompt
    this.outroPrompts = this.resolveOutroPrompts()
    this.injectedPrompts = []
    this.promptCompleteCbs = []

    const promptAPI = new PromptModuleAPI(this)
    promptModules.forEach((m) => m(promptAPI))
  }

  async create() {
    const { name, context, afterInvokeCbs, afterAnyInvokeCbs } = this

    const preset = await this.promptAndResolvePreset()

    // inject core service
    // cli-service的options保存下preset的所有信息
    preset.plugins['young-cli-service'] = Object.assign(
      {
        projectName: name,
      },
      preset,
    )

    const packageManager =
      loadOptions().packageManager || (hasYarn() ? 'yarn' : null) || 'npm'

    clearConsole()
    const pm = new PackageManager({
      context,
      forcePackageManager: packageManager,
    })

    log(`✨  Creating project in ${chalk.yellow(context)}.`)

    // get latest CLI plugin version
    const { latestMinor } = await getVersions()

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
        version = `~${latestMinor}`
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

    if(process.env.YOUNG_CLI_DEV) {
      log('skip installing process in development mode...')
    } else {
      await pm.install()
    }

    // run generator
    log(`🚀  Invoking generators...`)
    const plugins = await this.resolvePlugins(preset.plugins)
    const generator = new Generator(context, {
      pkg,
      plugins
    })
    await generator.generate({
      // 是否将配置文件抽离（如：babel/eslint等）
      extractConfigFiles: preset.useConfigFiles
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
  }

  async promptAndResolvePreset(answers = null) {
    // prompt
    if (!answers) {
      clearConsole(true)
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
  async resolvePlugins(rawPlugins) {
    // ensure cli-service is invoked first
    rawPlugins = sortObject(rawPlugins, ['young-cli-service'], true)
    const plugins = []
    for (const id of Object.keys(rawPlugins)) {
      const apply = loadModule(`${id}/generator`, this.context) || (() => {})
      let options = rawPlugins[id] || {}
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
