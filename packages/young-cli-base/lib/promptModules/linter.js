module.exports = cli => {
  const { chalk, hasGit } = require('young-common-utils')

  cli.injectFeature({
    name: 'Linter / Formatter',
    value: 'linter',
    short: 'Linter',
    description: 'Check and enforce code quality with ESLint or Prettier',
    link: 'https://github.com/vuejs/vue-cli/tree/dev/packages/%40vue/cli-plugin-eslint',
    plugins: ['eslint'],
    checked: true
  })

  cli.injectPrompt({
    name: 'eslintConfig',
    when: answers => answers.features.includes('linter'),
    type: 'list',
    message: 'Pick a linter / formatter config:',
    description: 'Checking code errors and enforcing an homogeoneous code style is recommended.',
    choices: answers => [
      {
        name: 'ESLint with error prevention only',
        value: 'base',
        short: 'Basic'
      },
      {
        name: 'ESLint + Airbnb config',
        value: 'airbnb',
        short: 'Airbnb'
      }
    ]
  })

  cli.injectPrompt({
    name: 'lintOn',
    message: 'Pick additional lint features:',
    when: answers => answers.features.includes('linter'),
    type: 'confirm',
    message: `use ${chalk.yellow('husky + lint-staged')}?`
  })

  cli.onPromptComplete((answers, options) => {
    if (answers.features.includes('linter')) {
      options.plugins['young-cli-plugin-eslint'] = {
        config: answers.eslintConfig, // String
        lintOn: answers.lintOn // Boolean
      }
    }
  })
}
