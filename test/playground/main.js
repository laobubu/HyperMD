'use strict'

///<reference path="./utils.js" />

requirejs.config({
  baseUrl: "https://cdn.jsdelivr.net/npm",
  // baseUrl: "/node_modules",
  paths: {
    hypermd: "/.",
    playground: window.location.pathname.replace(/\/[^\/]*$/, ''),
  },
  packages: [
    { name: "hypermd", main: "ai1.js" },
    { name: "codemirror", main: "lib/codemirror.js" },
    { name: "vue", main: "dist/vue.js" },
  ]
})

require(
  [
    'hypermd',
    'vue',

    'playground/component/vue-float-win',
    'playground/component/option-input',
  ],

  function (hypermd_0, vue_0) {
    HyperMD = hypermd_0, Vue = vue_0

    var $vm = new Vue({
      data() {
        return {
          args,
          windows: {
            hello: false,
            options: false,
          },
          options: null, // defined later
        }
      },
      mounted() {
        editor = HyperMD.fromTextArea(document.getElementById('my-textarea'), {
          theme: args.theme,
          hmdReadLink: { baseURI: args.file.replace(/\/?[^\/]+$/, '/') }
        })
        editor.setSize(null, '100%')

        var options = {}
        for (let k in HyperMD.Core.defaults.suggestedEditorConfig) {
          if (!/^hmd|^(?:theme)$/.test(k)) continue
          options[k] = deepClone(editor.getOption(k))
          this.$watch("options." + k, v => { editor.setOption(k, deepClone(v)) }, { deep: true })
        }
        this.options = options

        fetch_text(args.file).then(text => editor.setValue(text))
      },
      el: "#app",
    })
    window.$vm = $vm
  }
)
