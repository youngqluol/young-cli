const minimist = require('minimist')

// 从字符串中去除 ANSI 转义码
const stripAnsi = require('strip-ansi')

const {
  execa,
  semver,
  hasProjectYarn,
  error
} = require('young-common-utils')

const { executeCommand } = require('./executeCommand')

const registries = require('./registries')
const shouldUseTaobao = require('./shouldUseTaobao')
const { exit } = require('young-common-utils')

const PACKAGE_MANAGER_CONFIG = {
  npm: {
    install: ['install', '--loglevel', 'error'],
    add: ['install', '--loglevel', 'error'],
    upgrade: ['update', '--loglevel', 'error'],
    remove: ['uninstall', '--loglevel', 'error']
  },
  yarn: {
    install: [],
    add: ['add'],
    upgrade: ['upgrade'],
    remove: ['remove']
  }
}

class PackageManager {
  constructor ({ context, forcePackageManager } = {}) {
    this.context = context || process.cwd()
    this._registries = {}

    // only provide yarn/npm
    if(!forcePackageManager) {
      if(hasProjectYarn(context)) {
        forcePackageManager = 'yarn'
      } else {
        forcePackageManager = 'npm'
      }
    }

    this.bin = forcePackageManager

    if (this.bin === 'npm') {
      // npm doesn't support package aliases until v6.9
      const MIN_SUPPORTED_NPM_VERSION = '6.9.0'
      const npmVersion = stripAnsi(execa.sync('npm', ['--version']).stdout)

      if (semver.lt(npmVersion, MIN_SUPPORTED_NPM_VERSION)) {
        throw new Error(
          'You are using an outdated version of NPM.\n' +
          'It does not support some core functionalities of young CLI.\n' +
          'Please upgrade your NPM version.'
        )
      }

      if (semver.gte(npmVersion, '7.0.0')) {
        this.needsPeerDepsFix = true
      }
    }
  }

  // Any command that implemented registry-related feature should support
  // `-r` / `--registry` option
  async getRegistry (scope) {
    const cacheKey = scope || ''
    if (this._registries[cacheKey]) {
      return this._registries[cacheKey]
    }

    const args = minimist(process.argv, {
      alias: {
        r: 'registry'
      }
    })

    let registry
    if (args.registry) {
      registry = args.registry
    } else if (await shouldUseTaobao(this.bin)) {
      registry = registries.taobao
    } else {
      try {
        if (scope) {
          registry = (await execa(this.bin, ['config', 'get', scope + ':registry'])).stdout
        }
        if (!registry || registry === 'undefined') {
          registry = (await execa(this.bin, ['config', 'get', 'registry'])).stdout
        }
      } catch (e) {
        // Yarn 2 uses `npmRegistryServer` instead of `registry`
        registry = (await execa(this.bin, ['config', 'get', 'npmRegistryServer'])).stdout
      }
    }

    this._registries[cacheKey] = stripAnsi(registry).trim()
    return this._registries[cacheKey]
  }

  async setRegistryEnvs () {
    const registry = await this.getRegistry()

    // 设置依赖源
    process.env.npm_config_registry = registry
    process.env.YARN_NPM_REGISTRY_SERVER = registry
  }

  async runCommand (command, args) {
    const prevNodeEnv = process.env.NODE_ENV
    // when installing dependencies,
    // the `NODE_ENV` environment variable does no good;
    // it only confuses users by skipping dev deps (when set to `production`).
    delete process.env.NODE_ENV

    await this.setRegistryEnvs()
    await executeCommand(
      this.bin,
      [
        ...PACKAGE_MANAGER_CONFIG[this.bin][command],
        ...(args || [])
      ],
      this.context
    )

    if (prevNodeEnv) {
      process.env.NODE_ENV = prevNodeEnv
    }
  }

  async install () {
    const args = []

    if (this.needsPeerDepsFix) {
      args.push('--legacy-peer-deps')
    }

    return await this.runCommand('install', args)
  }

  async add (packageName, {
    tilde = false,
    dev = true
  } = {}) {
    const args = dev ? ['-D'] : []
    if (tilde) {
      if (this.bin === 'yarn') {
        args.push('--tilde')
      } else {
        process.env.npm_config_save_prefix = '~'
      }
    }

    if (this.needsPeerDepsFix) {
      args.push('--legacy-peer-deps')
    }

    return await this.runCommand('add', [packageName, ...args])
  }

  async remove (packageName) {
    return await this.runCommand('remove', [packageName])
  }

  async upgrade (packageName) {
    // manage multiple packages separated by spaces
    const packageNamesArray = []

    for (const packname of packageName.split(' ')) {
      packageNamesArray.push(packname)
    }

    if (packageNamesArray.length) return await this.runCommand('add', packageNamesArray)
  }
}

module.exports = PackageManager
