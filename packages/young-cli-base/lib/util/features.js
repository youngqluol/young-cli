const { chalk, toShortPluginId } = require('young-common-utils')

exports.getFeatures = preset => {
  const features = []
  const plugins = Object.keys(preset.plugins).filter(dep => {
    return dep !== 'young-cli-service'
  })
  features.push.apply(features, plugins)
  return features
}

exports.formatFeatures = (preset, name) => {
  const versionInfo = chalk.yellow(`[Vue 3]`)
  const features =
    name === 'default'
      ? [
          'router',
          'vuex',
          'eslint',
          'babel'
        ]
      : exports.getFeatures(preset)

  return (
    versionInfo +
    features
      .map(dep => {
        dep = toShortPluginId(dep)
        return chalk.yellow(dep)
      })
      .join(', ')
  )
}
