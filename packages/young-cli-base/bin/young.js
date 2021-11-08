#!/usr/bin/env node

const program = require('commander')
const { chalk } = require('young-common-utils')

program.version('0.0.1').usage('<command> [options]')

program
  .command('create <app-name>')
  .description('create a new project')
  .option('-d, --dev', 'developement mode') // 开发环境调试用
  .action(name => {
    if (process.argv.includes('-d') || process.argv.includes('--dev')) {
      process.env.YOUNG_CLI_DEV = true
    }
    require('../lib/create')(name)
  })

program
  .command('add <plugin-name>')
  .description(
    'install a plugin and invoke its generator in an already created project'
  )
  .action(plugin => {
    require('../lib/add')(plugin)
  })

program.on('command:*', ([cmd]) => {
  program.outputHelp()
  console.log()
  console.log(` ` + chalk.red(`unknown command: ${chalk.yellow(cmd)}`))
  process.exit(1)
})

program.parse(process.argv)
