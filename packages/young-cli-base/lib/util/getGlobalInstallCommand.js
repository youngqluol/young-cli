const { execa, hasYarn } = require('young-common-utils')

module.exports = function getGlobalInstallCommand () {
  if (hasYarn()) {
    const { stdout: yarnGlobalDir } = execa.sync('yarn', ['global', 'dir'])
    if (__dirname.includes(yarnGlobalDir)) {
      return 'yarn global add'
    }
  }

  const { stdout: npmGlobalPrefix } = execa.sync('npm', ['config', 'get', 'prefix'])
  if (__dirname.includes(npmGlobalPrefix)) {
    return `npm i -g`
  }
}
