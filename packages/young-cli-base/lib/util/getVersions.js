let sessionCached

module.exports = async function getVersions() {
  if (sessionCached) {
    return sessionCached
  }
  // 当前lerna管理的packages下的版本是一致的
  const local = require(`../../package.json`).version
  return (sessionCached = {
    current: local,
    latest: local,
    latestMinor: local,
  })
}
