const { execSync } = require('child_process')
const Module = require('module')
const path = require('path')
const fs = require('fs')

const chalk = require('chalk')
const readPkg = require('read-pkg')
const readline = require('readline')

// env
let _hasYarn
let _hasGit

exports.hasYarn = () => {
  if (_hasYarn != null) {
    return _hasYarn
  }
  try {
    execSync('yarn --version', { stdio: 'ignore' })
    return (_hasYarn = true)
  } catch (e) {
    return (_hasYarn = false)
  }
}

exports.hasProjectYarn = (cwd) => {
  const lockFile = path.join(cwd, 'yarn.lock')
  const result = fs.existsSync(lockFile)
  return checkYarn(result)
}

function checkYarn (result) {
  if (result && !exports.hasYarn()) throw new Error(`The project seems to require yarn but it's not installed.`)
  return result
}

exports.hasGit = () => {
  if (_hasGit != null) {
    return _hasGit
  }
  try {
    execSync('git --version', { stdio: 'ignore' })
    return (_hasGit = true)
  } catch (e) {
    return (_hasGit = false)
  }
}

exports.hasProjectGit = (cwd) => {
  let result
  try {
    execSync('git status', { stdio: 'ignore', cwd })
    result = true
  } catch (e) {
    result = false
  }
  return result
}

// exit
exports.exit = function (code) {
  process.exit(code)
}

// logger
exports.chalk = chalk

exports.log = function (...args) {
  console.log(...args)
}

exports.warn = function (msg) {
  console.warn(chalk.bgYellow.black(' WARN: ') + '\n' + chalk.yellow(msg))
}

exports.error = function (msg) {
  console.error(chalk.bgRed(' ERROR: ') + '\n' + chalk.red(msg))
}

exports.clearConsole = (title) => {
  if (process.stdout.isTTY) {
    const blank = '\n'.repeat(process.stdout.rows)
    console.log(blank)
    readline.cursorTo(process.stdout, 0, 0)
    readline.clearScreenDown(process.stdout)
    if (title) {
      console.log(title)
    }
  }
}

exports.createBoxenText = (
  text,
  options = {
    align: 'center',
    borderColor: 'green',
    padding: 1,
    margin: 1,
    borderStyle: 'double',
  },
) => {
  return require('boxen')(text, options)
}

// module
const createRequire =
  Module.createRequire ||
  Module.createRequireFromPath ||
  function (filename) {
    const mod = new Module(filename, null)
    mod.filename = filename
    mod.paths = Module._nodeModulePaths(path.dirname(filename))

    mod._compile(`module.exports = require;`, filename)

    return mod.exports
  }

exports.loadModule = function (request, context) {
  return createRequire(path.resolve(context, 'package.json'))(request)
}

// object
exports.set = function (target, path, value) {
  const fields = path.split('.')
  let obj = target
  const l = fields.length
  for (let i = 0; i < l - 1; i++) {
    const key = fields[i]
    if (!obj[key]) {
      obj[key] = {}
    }
    obj = obj[key]
  }
  obj[fields[l - 1]] = value
}

exports.get = function (target, path) {
  const fields = path.split('.')
  let obj = target
  const l = fields.length
  for (let i = 0; i < l - 1; i++) {
    const key = fields[i]
    if (!obj[key]) {
      return undefined
    }
    obj = obj[key]
  }
  return obj[fields[l - 1]]
}

exports.unset = function (target, path) {
  const fields = path.split('.')
  let obj = target
  const l = fields.length
  const objs = []
  for (let i = 0; i < l - 1; i++) {
    const key = fields[i]
    if (!obj[key]) {
      return
    }
    objs.unshift({ parent: obj, key, value: obj[key] })
    obj = obj[key]
  }
  delete obj[fields[l - 1]]
  // Clear empty objects
  for (const { parent, key, value } of objs) {
    if (!Object.keys(value).length) {
      delete parent[key]
    }
  }
}

// pkg
exports.resolvePkg = function (context) {
  if (fs.existsSync(path.join(context, 'package.json'))) {
    return readPkg.sync({ cwd: context })
  }
  return {}
}

// fetch
exports.request = {
  get(url, opts) {
    // lazy require
    const fetch = require('node-fetch')
    const reqOpts = {
      method: 'GET',
      timeout: 30000,
      ...opts,
    }

    return fetch(url, reqOpts).then((result) => result.json())
  },
}

// ora
exports.ora = require('ora')

// execa
const execa = (exports.execa = require('execa'))

exports.runCommand = (command, args, cwd) => {
  if (!args) {
    const [_command, ..._args] = command.split(/\s+/)
  }
  return execa(_command, args || _args, { cwd })
}

// semver
exports.semver = require('semver')

// plugin
const pluginRE = /young-cli-plugin-/

exports.isPlugin = id => pluginRE.test(id)