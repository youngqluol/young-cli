module.exports = (api) => {
  api.injectImports(api.entryFile, `import store from './store'`)

  api.transformScript(api.entryFile, require('./injectUseStore'))
  api.extendPackage({
    dependencies: {
      vuex: '^4.0.0'
    }
  })
  api.render('./template', {})
}
