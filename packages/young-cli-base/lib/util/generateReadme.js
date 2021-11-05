const descriptions = {
  build: 'Compiles and minifies for production',
  'build:test': 'Compiles and minifies for test env',
  dev: 'Compiles and hot-reloads for development',
}

function printScripts(pkg, packageManager) {
  return Object.keys(pkg.scripts || {})
    .map((key) => {
      if (!descriptions[key]) return ''
      return [
        `\n### ${descriptions[key]}`,
        '```',
        `${packageManager} ${packageManager !== 'yarn' ? 'run ' : ''}${key}`,
        '```',
        '',
      ].join('\n')
    })
    .join('')
}

module.exports = function generateReadme(pkg, packageManager) {
  return [
    `# ${pkg.name}\n`,
    '## Project setup',
    '```',
    `${packageManager} install`,
    '```',
    printScripts(pkg, packageManager),
    '',
  ].join('\n')
}
