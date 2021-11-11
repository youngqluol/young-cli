const inquirer = require('inquirer')
const Generator = require('./Generator')
const getVersions = require('./util/getVersions')
const PackageManager = require('./util/ProjectPackageManager')
const { log, error, loadModule, chalk } = require('young-common-utils')
const readFiles = require('./util/readFiles')

async function add(pluginToAdd, context = process.cwd()) {
  pluginToAdd = pluginToAdd.replace(/young-cli-plugin-/, '').toLocaleLowerCase()
  const packageName = `young-cli-plugin-${pluginToAdd}@${getVersions()}`
  const id = `young-cli-plugin-${pluginToAdd}`

  log()
  log(`📦  Installing ${chalk.cyan(packageName)}...`)
  log()

  const pm = new PackageManager({ context })

  await pm.add(packageName)

  log(
    `${chalk.green('✔')}  Successfully installed plugin: ${chalk.cyan(
      packageName
    )}`
  )
  log()

  let pluginOptions = {}
  let pluginPrompts = loadModule(`${id}/prompts`, context)
  if (pluginPrompts) {
    const prompt = inquirer.createPromptModule()
    pluginOptions = await prompt(pluginPrompts)
  }

  const pluginGenerator = loadModule(`${id}/generator`, context)
  const plugin = {
    id,
    apply: pluginGenerator,
    options: {
      ...pluginOptions
    }
  }

  const afterInvokeCbs = []
  const generator = new Generator(context, {
    pkg,
    plugins: [plugin],
    afterInvokeCbs,
    files: await readFiles(context)
  })

  log(`🚀  Invoking generator for ${packageName}...`)

  await generator.generate({
    extractConfigFiles: true
  })

  log(`📦  Installing additional dependencies...`)
  await pm.install()

  log('⚓', `Running completion hooks...`)
  if (afterInvokeCbs.length) {
    for (const cb of afterInvokeCbs) {
      await cb()
    }
  }
}

module.exports = (...args) => {
  return add(...args).catch(err => {
    error(err)
    process.exit(1)
  })
}
