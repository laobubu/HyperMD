import * as path from 'path'
import buble from 'rollup-plugin-buble'
import typescript from 'rollup-plugin-typescript2'
import { uglify } from 'rollup-plugin-uglify'

const watchMode = process.argv.includes("-w")
const makeAi1 = process.argv.includes("--with-ai1") || !watchMode

const srcDir = path.join(__dirname, "src")
const { components, globalNames, externalNames, bundleFiles } = require(__dirname + '/dev/HyperMD.config')

const banner = `
/*!
 * HyperMD, copyright (c) by laobubu
 * Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
 *
 * Break the Wall between writing and preview, in a Markdown Editor.
 *
 * HyperMD makes Markdown editor on web WYSIWYG, based on CodeMirror
 *
 * Homepage: http://laobubu.net/HyperMD/
 * Issues: https://github.com/laobubu/HyperMD/issues
 */
`.trim()

const plugins = {
  ts: typescript({
    tsconfigOverride: {
      compilerOptions: {
        "target": "es6",
        "module": "es6",
        "declaration": false,
      }
    }
  }),
  uglify: uglify({
    output: {
      comments: /^!/,
    },
  }),
  buble: buble({
    namedFunctionExpressions: false,
    transforms: {
      dangerousForOf: true,   // simplify `for (let i=0;i...)` to `for (let it of arr)`
    }
  }),
}

var configs = []

function isExternal(mod) {
  if (/\.css$/.test(mod)) return true
  for (const modBase of externalNames) {
    if (mod.substr(0, modBase.length) === modBase) return true
  }
  return false
}

bundleFiles.forEach(item => {
  var item_plugins = [plugins.ts] // Essential: typescript
  if (item.uglify) item_plugins.push(plugins.uglify) // optional: uglify
  item_plugins.push(plugins.buble) // Essential: Buble

  var out = {
    input: "./" + item.entry,
    external: isExternal,
    output: {
      file: './' + item.output,
      format: 'umd',
      name: item.name,
      globals: globalNames,
      banner,
    },
    plugins: item_plugins
  }

  configs.push(out)
})

export default configs
