module.exports = (api, { config, lintOn = [] }, rootOptions) => {
  const eslintConfig = require('../eslintOptionss')(api, config)
  const devDependencies = require('../eslintDeps')(api, config).getDeps()

  const pkg = {
    scripts: {},
    eslintConfig,
    devDependencies
  }

  api.render(`./template`, { usePrettier: config !== 'base' })

  if (typeof lintOn === 'string') {
    lintOn = lintOn.split(',')
  }

  if (!lintOn.includes('save')) {
    pkg.vue = {
      lintOnSave: false // eslint-loader configured in runtime plugin
    }
  }

  if (lintOn.includes('commit')) {
    Object.assign(pkg.devDependencies, {
      'lint-staged': '^11.1.2'
    })
    pkg.gitHooks = {
      'pre-commit': 'lint-staged'
    }
    const extensions = require('../eslintOptions')
      .extensions(api)
      .map(ext => ext.replace(/^\./, '')) // remove the leading `.`
    pkg['lint-staged'] = {
      [`*.{${extensions.join(',')}}`]: 'vue-cli-service lint'
    }
  }

  api.extendPackage(pkg)
}
