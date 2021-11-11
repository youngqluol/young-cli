const DEPS_MAP = {
  base: {
    eslint: '^7.20.0',
    'eslint-loader': '^4.0.2',
    'eslint-friendly-formatter': '^4.0.1',
    'eslint-plugin-vue': '^7.2.0'
  },
  airbnb: {
    '@vue/eslint-config-airbnb': '^5.3.0',
    'eslint-plugin-import': '^2.20.2',
    '@vue/eslint-config-prettier': '^6.0.0',
    'eslint-plugin-prettier': '^3.3.1',
    prettier: '^2.2.1'
  }
}

exports.DEPS_MAP = DEPS_MAP

exports.getDeps = function (api, preset) {
  const deps = Object.assign({}, DEPS_MAP.base, DEPS_MAP[preset])

  if (api.hasPlugin('babel')) {
    Object.assign(deps, {
      '@babel/eslint-parser': '^7.12.16',
      '@babel/core': '^7.12.16'
    })
  }

  return deps
}
