import buble from 'rollup-plugin-buble'
import typescript from 'rollup-plugin-typescript2'
import { uglify } from 'rollup-plugin-uglify'

const { banner } = require(__dirname + '/dev/HyperMD.config')

// Build all-in-one bundle for Plain Browser Env!

export default {
  input: "./src/everything.ts",
  output: {
    file: './ai1.js',
    format: 'umd',
    name: "HyperMD",
    globals: {
      codemirror: "CodeMirror"
    },
    banner: banner + "\n/*! WARNING: This all-in-one bundle is FOR Plain Browser Env ONLY!\n ** DO NOT Use this with any bundler or js module loader. */\n",
  },
  external: (name) => /^codemirror|\.css$/.test(name),
  plugins: [
    typescript({
      tsconfigOverride: {
        compilerOptions: {
          "target": "es6",
          "module": "es6",
          "declaration": false,
        }
      }
    }),
    uglify({
      output: {
        comments: /^!/,
      },
    }),
    buble({
      namedFunctionExpressions: false,
      transforms: {
        dangerousForOf: true,   // simplify `for (let i=0;i...)` to `for (let it of arr)`
      }
    }),
  ],
}
