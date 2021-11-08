const fs = require('fs')
const cloneDeep = require('lodash.clonedeep')
const { getRcPath } = require('./util/rcPath')
const { exit, error } = require('young-common-utils')

const rcPath = (exports.rcPath = getRcPath('.youngrc'))

exports.defaultPreset = {
  useConfigFiles: false,
  plugins: {
    'young-cli-plugin-babel': {},
    'young-cli-plugin-eslint': {
      config: 'base',
      lintOn: ['save'],
    },
  },
}

exports.defaults = {
  lastChecked: undefined,
  latestVersion: undefined,

  packageManager: undefined,
  useTaobaoRegistry: undefined,
  presets: {
    default: exports.defaultPreset,
  },
}

let cachedOptions

exports.loadOptions = () => {
  if (cachedOptions) {
    return cachedOptions
  }
  if (fs.existsSync(rcPath)) {
    try {
      cachedOptions = JSON.parse(fs.readFileSync(rcPath, 'utf-8'))
    } catch (e) {
      error(
        `Error loading saved preferences: ` +
          `~/.vuerc may be corrupted or have syntax errors. ` +
          `Please fix/delete it and re-run vue-cli in manual mode.\n` +
          `(${e.message})`,
      )
      exit(1)
    }
    return cachedOptions
  } else {
    return {}
  }
}

exports.saveOptions = (toSave) => {
  const options = Object.assign(cloneDeep(exports.loadOptions()), toSave)
  for (const key in options) {
    // 删除无效key值
    if (!(key in exports.defaults)) {
      delete options[key]
    }
  }
  cachedOptions = options
  try {
    fs.writeFileSync(rcPath, JSON.stringify(options, null, 2))
    return true
  } catch (e) {
    error(
      `Error saving preferences: ` +
        `make sure you have write access to ${rcPath}.\n` +
        `(${e.message})`,
    )
  }
}

exports.savePreset = (name, preset) => {
  const presets = cloneDeep(exports.loadOptions().presets || {})
  presets[name] = preset
  return exports.saveOptions({ presets })
}
