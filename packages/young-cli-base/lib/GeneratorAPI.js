const fs = require('fs')
const ejs = require('ejs')
const path = require('path')
const resolve = require('resolve')
const { isBinaryFileSync } = require('isbinaryfile')
const { runTransformation } = require('vue-codemod')
const stringifyJS = require('./util/stringifyJS')
const ConfigTransform = require('./ConfigTransform')
const {
  error,
  toShortPluginId,
} = require('young-common-utils')

const isString = val => typeof val === 'string'
const isObject = val => val && typeof val === 'object'
class GeneratorAPI {
  /**
   * @param {string} id - Id of the owner plugin
   * @param {Generator} generator - The invoking Generator instance
   * @param {object} options - generator options passed to this plugin
   * @param {object} rootOptions - root options (the entire preset)
   */
  constructor(id, generator, options, rootOptions) {
    this.id = id
    this.generator = generator
    this.options = options
    this.rootOptions = rootOptions

    /* eslint-disable no-shadow */
    this.pluginsData = generator.plugins
      .filter(({ id }) => id !== `young-cli-service`)
      .map(({ id }) => ({
        name: toShortPluginId(id)
      }))
    /* eslint-enable no-shadow */

    this._entryFile = undefined
  }

  /**
   * Resolves the data when rendering templates.
   *
   * @private
   */
  _resolveData(additionalData) {
    return Object.assign(
      {
        options: this.options,
        rootOptions: this.rootOptions,
        plugins: this.pluginsData
      },
      additionalData
    )
  }

  /**
   * Inject a file processing middleware.
   *
   * @private
   * @param {FileMiddleware} middleware - A middleware function that receives the
   *   virtual files tree object, and an ejs render function. Can be async.
   */
  _injectFileMiddleware(middleware) {
    this.generator.fileMiddlewares.push(middleware)
  }

  /**
   * Normalize absolute path, Windows-style path
   * to the relative path used as index in this.files
   * @param {string} p the path to normalize
   */
  _normalizePath(p) {
    if (path.isAbsolute(p)) {
      p = path.relative(this.generator.context, p)
    }
    // The `files` tree always use `/` in its index.
    // So we need to normalize the path string in case the user passes a Windows path.
    return p.replace(/\\/g, '/')
  }

  /**
   * Resolve path for a project.
   *
   * @param {string} _paths - A sequence of relative paths or path segments
   * @return {string} The resolved absolute path, caculated based on the current project root.
   */
  resolve(..._paths) {
    return path.resolve(this.generator.context, ..._paths)
  }

  get cliVersion() {
    return require('../package.json').version
  }

  /**
   * Check if the project has a given plugin.
   */
  hasPlugin(id) {
    return this.generator.hasPlugin(id)
  }

  /**
   * Configure how config files are extracted.
   *
   * @param {string} key - Config key in package.json
   * @param {object} options - Options
   * @param {object} options.file - File descriptor
   * Used to search for existing file.
   * Each key is a file type (possible values: ['js', 'json', 'yaml', 'lines']).
   * The value is a list of filenames.
   * Example:
   * {
   *   js: ['.eslintrc.js'],
   *   json: ['.eslintrc.json', '.eslintrc']
   * }
   * By default, the first filename will be used to create the config file.
   */
  addConfigTransform(key, options) {
    const hasReserved = Object.keys(
      this.generator.reservedConfigTransforms
    ).includes(key)
    if (hasReserved || !options || !options.file) {
      if (hasReserved) {
        const { warn } = require('young-common-utils')
        warn(`Reserved config transform '${key}'`)
      }
      return
    }

    this.generator.configTransforms[key] = new ConfigTransform(options)
  }

  // 添加或合并package.json选项
  extendPackage(fields) {
    const pkg = this.pkg
    for (const key in fields) {
      const value = fields[key]
      const existing = pkg[key]
      if (
        isObject(value) &&
        (key === 'dependencies' ||
          key === 'devDependencies' ||
          key === 'scripts')
      ) {
        pkg[key] = Object.assign(existing || {}, value)
      } else {
        pkg[key] = value
      }
    }
  }

  /**
   * Render template files into the virtual files tree object.
   *
   * @param {string | object | FileMiddleware} source -
   *   Can be one of:
   *   - relative path to a directory;
   *   - Object hash of { sourceTemplate: targetFile } mappings;
   *   - a custom file middleware function.
   * @param {object} [additionalData] - additional data available to templates.
   * @param {object} [ejsOptions] - options for ejs.
   */
  render(source, additionalData = {}, ejsOptions = {}) {
    // 获取调用 generator.render() 函数的文件的父目录路径
    const baseDir = extractCallDir()
    if (isString(source)) {
      source = path.resolve(baseDir, source)
      this._injectFileMiddleware(async files => {
        const data = this._resolveData(additionalData)
        const globby = require('globby')
        const _files = await globby(['**/*'], { cwd: source, dot: true })
        for (const rawPath of _files) {
          const targetPath = rawPath
            .split('/')
            .map(filename => {
              // dotfiles are ignored when published to npm, therefore in templates
              // we need to use underscore instead (e.g. "_gitignore")
              if (filename.charAt(0) === '_' && filename.charAt(1) !== '_') {
                return `.${filename.slice(1)}`
              }
              if (filename.charAt(0) === '_' && filename.charAt(1) === '_') {
                return `${filename.slice(1)}`
              }
              return filename
            })
            .join('/')
          const sourcePath = path.resolve(source, rawPath)
          const content = renderFile(sourcePath, data, ejsOptions)
          // only set file if it's not all whitespace, or is a Buffer (binary files)
          if (Buffer.isBuffer(content) || /[^\s]/.test(content)) {
            files[targetPath] = content
          }
        }
      })
    }
  }

  /**
   * convenience method for generating a js config file from json
   */
  genJSConfig(value) {
    return `module.exports = ${stringifyJS(value, null, 2)}`
  }

  /**
   * Turns a string expression into executable JS for JS configs.
   * @param {*} str JS expression as a string
   */
  makeJSOnlyValue(str) {
    const fn = () => {}
    fn.__expression = str
    return fn
  }

  /**
   * Run codemod on a script file or the script part of a .vue file
   * @param {string} file the path to the file to transform
   * @param {Codemod} codemod the codemod module to run
   * @param {object} options additional options for the codemod
   */
  transformScript(file, codemod, options) {
    const normalizedPath = this._normalizePath(file)

    this._injectFileMiddleware(files => {
      if (typeof files[normalizedPath] === 'undefined') {
        error(`Cannot find file ${normalizedPath}`)
        return
      }

      files[normalizedPath] = runTransformation(
        {
          path: this.resolve(normalizedPath),
          source: files[normalizedPath]
        },
        codemod,
        options
      )
    })
  }

  /**
   * Add import statements to a file.
   */
  injectImports(file, imports) {
    const _imports =
      this.generator.imports[file] || (this.generator.imports[file] = new Set())
    ;(Array.isArray(imports) ? imports : [imports]).forEach(imp => {
      _imports.add(imp)
    })
  }

  /**
   * Add options to the root Vue instance (detected by `new Vue`).
   */
  injectRootOptions(file, options) {
    const _options =
      this.generator.rootOptions[file] ||
      (this.generator.rootOptions[file] = new Set())
    ;(Array.isArray(options) ? options : [options]).forEach(opt => {
      _options.add(opt)
    })
  }

  /**
   * Get the entry file taking into account typescript.
   *
   * @readonly
   */
  get entryFile() {
    if (this._entryFile) return this._entryFile
    return (this._entryFile = fs.existsSync(this.resolve('src/main.ts'))
      ? 'src/main.ts'
      : 'src/main.js')
  }
}
// https://segmentfault.com/a/1190000007076507 
// 获取调用栈信息
function extractCallDir() {
  // extract api.render() callsite file location using error stack
  const obj = {}
  Error.captureStackTrace(obj)
  const callSite = obj.stack.split('\n')[3]

  // the regexp for the stack when called inside a named function
  const namedStackRegExp = /\s\((.*):\d+:\d+\)$/
  // the regexp for the stack when called inside an anonymous
  const anonymousStackRegExp = /at (.*):\d+:\d+$/

  let matchResult = callSite.match(namedStackRegExp)
  if (!matchResult) {
    matchResult = callSite.match(anonymousStackRegExp)
  }

  const fileName = matchResult[1]
  return path.dirname(fileName)
}

const replaceBlockRE = /<%# REPLACE %>([^]*?)<%# END_REPLACE %>/g

function renderFile(name, data, ejsOptions) {
  if (isBinaryFileSync(name)) {
    return fs.readFileSync(name) // return buffer
  }
  const template = fs.readFileSync(name, 'utf-8')

  // custom template inheritance via yaml front matter.
  // ---
  // extend: 'source-file'
  // replace: !!js/regexp /some-regex/
  // OR
  // replace:
  //   - !!js/regexp /foo/
  //   - !!js/regexp /bar/
  // ---
  const yaml = require('yaml-front-matter')
  const parsed = yaml.loadFront(template)
  const content = parsed.__content
  let finalTemplate = content.trim() + `\n`

  if (parsed.when) {
    finalTemplate =
      `<%_ if (${parsed.when}) { _%>` + finalTemplate + `<%_ } _%>`

    // use ejs.render to test the conditional expression
    // if evaluated to falsy value, return early to avoid extra cost for extend expression
    const result = ejs.render(finalTemplate, data, ejsOptions)
    if (!result) {
      return ''
    }
  }

  if (parsed.extend) {
    const extendPath = path.isAbsolute(parsed.extend)
      ? parsed.extend
      : resolve.sync(parsed.extend, { basedir: path.dirname(name) })
    finalTemplate = fs.readFileSync(extendPath, 'utf-8')
    if (parsed.replace) {
      if (Array.isArray(parsed.replace)) {
        const replaceMatch = content.match(replaceBlockRE)
        if (replaceMatch) {
          const replaces = replaceMatch.map(m => {
            return m.replace(replaceBlockRE, '$1').trim()
          })
          parsed.replace.forEach((r, i) => {
            finalTemplate = finalTemplate.replace(r, replaces[i])
          })
        }
      } else {
        finalTemplate = finalTemplate.replace(parsed.replace, content.trim())
      }
    }
  }

  return ejs.render(finalTemplate, data, ejsOptions)
}

module.exports = GeneratorAPI
