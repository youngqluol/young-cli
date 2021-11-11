module.exports = (api, options = {}) => {

  api.injectImports(api.entryFile, `import router from './router'`)

  api.transformScript(api.entryFile, require('./injectUseRouter'))
  api.extendPackage({
    dependencies: {
      'vue-router': '^4.0.3'
    }
  })

  api.render('./template', {
    historyMode: options.historyMode,
    doesCompile: api.hasPlugin('babel')
  })
}
