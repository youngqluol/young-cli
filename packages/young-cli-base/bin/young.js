#!/usr/bin/env node

const program = require('commander')
const chalk = require('chalk')

program.version('0.0.1').usage('<command> [options]')

program
  .command('create <app-name>')
  .description('create a new project')
  .action((name) => {
    console.log('young', name)
  })

program
  .command('add <plugin-name>')
  .description('install a plugin and invoke its generator in an already created project')
  .action((plugin) => {
    console.log('young', plugin)
  })

program.on('command:*', ([cmd]) => {
  program.outputHelp()
  console.log()
  console.log(` ` + chalk.red(`unknown command: ${chalk.yellow(cmd)}`))
  process.exit(1)
})

program.parse(process.argv)