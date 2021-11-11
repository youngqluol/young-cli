module.exports = (api, options) => {
  api.render('./template', {
    useBabel: api.hasPlugin('babel'),
    useEslint: api.hasPlugin('eslint')
  })

  // extend vue3
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
    postcss: {
      plugins: ['autoprefixer']
    },
    devDependencies: {
      autoprefixer: '^10.3.4',
      'css-minimizer-webpack-plugin': '^3.0.2',
      'css-loader': '^6.2.0',
      'cross-env': '^7.0.3',
      'filemanager-webpack-plugin': '^6.1.7',
      'file-loader': '^6.2.0',
      'html-webpack-plugin': '^5.3.2',
      less: '^4.1.1',
      'less-loader': '^10.0.1',
      'mini-css-extract-plugin': '^2.3.0',
      postcss: '^8.3.6',
      'postcss-loader': '^6.1.1',
      'style-loader': '^3.2.1',
      'terser-webpack-plugin': '^5.2.4',
      'url-loader': '^4.1.1',
      'vue-loader': '^16.5.0',
      webpack: '^5.52.0',
      'webpack-bundle-analyzer': '^4.4.2',
      'webpack-cli': '^4.8.0',
      'webpack-dev-server': '^4.2.0',
      'webpack-merge': '^5.8.0'
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
