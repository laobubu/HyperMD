import buble from 'rollup-plugin-buble'
import typescript from 'rollup-plugin-typescript2'
import { uglify } from 'rollup-plugin-uglify'

const { banner, globalNames, externalNames, bundleFiles } = require(__dirname + '/dev/HyperMD.config')

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

  var _banner = banner
  if (item.banner) _banner += "\n" + item.banner

  var out = {
    input: "./" + item.entry,
    external: isExternal,
    output: {
      file: './' + item.output,
      format: 'umd',
      name: item.name,
      globals: globalNames,
      banner: _banner,
    },
    plugins: item_plugins
  }

  configs.push(out)
})

export default configs
