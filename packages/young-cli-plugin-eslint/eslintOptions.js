exports.config = (api, preset) => {
  const config = {
    root: true,
    env: { browser: true, node: true },
    extends: ['plugin:vue/vue3-essential'],
    parserOptions: {
      ecmaVersion: 2020
    },
    rules: {
      'no-console': makeJSOnlyValue(
        `process.env.NODE_ENV === 'production' ? 'warn' : 'off'`
      ),
      'no-debugger': makeJSOnlyValue(
        `process.env.NODE_ENV === 'production' ? 'warn' : 'off'`
      ),
      'import/no-extraneous-dependencies': 0,
      'vue/no-multiple-template-root': 0,
      'vue/mustache-interpolation-spacing': ['error', 'always'],
      'vue/object-curly-spacing': ['error', 'always'],
      'vue/max-attributes-per-line': [
        'error',
        {
          singleline: 1,
          multiline: {
            max: 1,
            allowFirstLine: true
          }
        }
      ],
      'vue/html-indent': [
        'error',
        2,
        {
          attribute: 1,
          baseIndent: 1,
          closeBracket: 0,
          alignAttributesVertically: true,
          ignores: []
        }
      ],
      'no-undef': 1,
      'no-unused-vars': 1,
      'arrow-parens': 0,
      'comma-dangle': 0,
      'import/no-unresolved': 0,
      'import/extensions': 0,
      'global-require': 0,
      'no-plusplus': 0,
      'linebreak-style': 0,
      'no-param-reassign': 0
    }
  }

  if (api.hasPlugin('babel')) {
    config.parserOptions = {
      parser: '@babel/eslint-parser'
    }
  }

  if (preset !== 'base') {
    config.extends.push('@vue/airbnb')
  } else {
    // default
    config.extends.push('eslint:recommended')
  }

  return config
}

// __expression is a special flag that allows us to customize stringification
// output when extracting configs into standalone files
function makeJSOnlyValue(str) {
  const fn = () => {}
  fn.__expression = str
  return fn
}

exports.extensions = ['.js', '.jsx', '.vue']
