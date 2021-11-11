const { runCommand, error } = require('young-common-utils')

module.exports = (api, { config, lintOn = [] }, rootOptions) => {
  const eslintConfig = require('../eslintOptionss')(api, config)
  const devDependencies = require('../eslintDeps').getDeps(api, config)

  const pkg = {
    eslintConfig,
    devDependencies
  }

  api.render(`./template`, { usePrettier: config !== 'base' })

  if (lintOn) {
    Object.assign(pkg.devDependencies, {
      husky: '^7.0.0',
      'lint-staged': '^11.1.2'
    })
    pkg.scripts = {
      precommit: 'lint-staged',
      prepare: 'husky install'
    }
    pkg['lint-staged'] = {
      'src/**/*.{js,json,css,vue}': 'eslint --fix'
    }
  }

  api.extendPackage(pkg)

  api.afterAnyInvoke(async () => {
    try {
      await runCommand(
        'npx husky add .husky/pre-commit "npm run precommit"',
        null,
        rootOptions.context
      )
    } catch (e) {
      error('npx husky add .husky/pre-commit')
    }
  })
}
