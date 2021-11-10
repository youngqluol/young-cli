module.exports = api => {
  // 先删除原有的
  delete api.generator.files['babel.config.js']

  api.extendPackage({
    babel: {
      presets: [
        [
          '@babel/preset-env',
          {
            useBuiltIns: 'usage',
            corejs: '3.0'
          }
        ]
      ],
      plugins: [['@babel/plugin-transform-runtime', { corejs: 3 }]]
    },
    browserslist: ['> 1%', 'last 2 versions', 'not dead', 'not ie 11'],
    dependencies: {
      '@babel/runtime': '^7.15.4',
      '@babel/runtime-corejs3': '^7.15.4',
      'core-js': '^3.8.3'
    },
    devDependencies: {
      '@babel/plugin-proposal-class-properties': '^7.14.5',
      '@babel/plugin-proposal-object-rest-spread': '^7.15.6',
      '@babel/plugin-transform-runtime': '^7.15.0',
      '@babel/preset-env': '^7.15.6',
      'babel-loader': '^8.2.2'
    }
  })
}
