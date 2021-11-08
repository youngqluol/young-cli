module.exports = (api, options) => {
  api.render('./template', {
    doesCompile: api.hasPlugin('babel'),
    useBabel: api.hasPlugin('babel')
  })

  // extend vue
  api.extendPackage({
    dependencies: {
      vue: '^3.2.11'
    },
    devDependencies: {
      '@vue/compiler-sfc': '^3.2.11'
    }
  })

  // extend webpack相关
  api.extendPackage({
    scripts: {
      dev: 'webpack serve --color --progress --config build/webpack.dev.js',
      'build:test':
        'cross-env NODE_ENV=test webpack --color --progress --config build/webpack.prod.js',
      build:
        'cross-env NODE_ENV=production webpack --color --progress --config build/webpack.prod.js'
    },
    browserslist: ['> 1%', 'last 2 versions', 'not dead', 'not ie 11'],
    devDependencies: {
      'cross-env': '^7.0.3',
      webpack: '^5.52.0',
      'webpack-bundle-analyzer': '^4.4.2',
      'webpack-cli': '^4.8.0',
      'webpack-dev-server': '^4.2.0',
      'webpack-merge': '^5.8.0',
      'terser-webpack-plugin': '^5.2.4',
      'mini-css-extract-plugin': '^2.3.0',
      'html-webpack-plugin': '^5.3.2',
      'filemanager-webpack-plugin': '^6.1.7',
      'file-loader': '^6.2.0',
      'css-minimizer-webpack-plugin': '^3.0.2',
      'css-loader': '^6.2.0',
      'style-loader': '^3.2.1',
      'clean-webpack-plugin': '^4.0.0'
    }
  })

  // extend less
  api.extendPackage({
    devDependencies: {
      less: '^4.1.1',
      'less-loader': '^10.0.1'
    }
  })
}
