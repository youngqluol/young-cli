const { chalk } = require('young-common-utils')

exports.getFeatures = (preset) => {
  const features = []
  if (preset.router) {
    features.push('router')
  }
  if (preset.vuex) {
    features.push('vuex')
  }
  if (preset.cssPreprocessor) {
    features.push(preset.cssPreprocessor)
  }
  const plugins = Object.keys(preset.plugins).filter(dep => {
    return dep !== '@vue/cli-service'
  })
  features.push.apply(features, plugins)
  return features
}

exports.formatFeatures = (preset) => {
  const versionInfo = chalk.yellow(`[Vue 3]`)
  const features = exports.getFeatures(preset)

  return versionInfo + features.map(dep => {
    return chalk.yellow(dep)
  }).join(', ')
}
