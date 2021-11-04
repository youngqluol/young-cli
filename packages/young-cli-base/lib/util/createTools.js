exports.getPromptModules = () => {
  // TODO: 支持 【vue版本选择、ts、css预处理器选择、单元测试】
  return [
    // 'vueVersion',
    'babel',
    // 'typescript',
    'router',
    'vuex',
    // 'cssPreprocessors',
    'linter',
    // 'unit'
  ].map(file => require(`../promptModules/${file}`))
}
