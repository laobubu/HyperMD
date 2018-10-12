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
    { name: "hypermd", main: "everything.js" },
    { name: "codemirror", main: "lib/codemirror.js" },
    { name: "vue", main: "dist/vue.js" },
  ]
})

var themeCSSLink = elt("link", { rel: 'stylesheet', href: '/theme/' + args.theme + '.css' })
document.body.appendChild(themeCSSLink)

var dependencies = [
  'hypermd',
  'vue',

  'playground/component/vue-float-win',
  'playground/component/option-input',
]

for (let k of args.plugins.trim().split(";")) {
  let mat = k.trim().split(/\s*=\s*/, 2)
  let [name, main] = mat
  console.log("Plugin: found " + name + " with main-entry: " + main)
  if (main) {
    requirejs.config({ packages: [{ name, main }] })
  }
  dependencies.push(name)
}

require(dependencies, function (hypermd_0, vue_0) {
  HyperMD = hypermd_0, Vue = vue_0

  var $vm = new Vue({
    data() {
      return {
        args,
        windows: {
          options: false,
          plugins: false,
        },
        options: null, // defined later
        plugins_lined: args.plugins.replace(/;/g, '\n'),
      }
    },
    computed: {
      HyperMD() { return HyperMD },
      url() {
        var parts = []
        for (var name in args) {
          if (args[name] !== defaultArgs[name]) parts.push(name + '=' + encodeURIComponent(args[name]))
        }
        return '?' + parts.join('&')
      }
    },
    watch: {
      url(newURL) { history.replaceState(null, null, newURL) },
    },
    methods: {
      set_theme(ev) {
        let theme = ev.target.value
        this.args.theme = theme
        themeCSSLink.addEventListener("load", apply2, false)
        themeCSSLink.href = '/theme/' + args.theme + '.css'
        function apply2() { editor.setOption('theme', theme); themeCSSLink.removeEventListener("load", apply2, false) }
      },
      refresh_page() {
        location.reload()
      },
    },
    mounted() {
      editor = HyperMD.fromTextArea(document.getElementById('my-textarea'), {
        theme: args.theme,
        hmdReadLink: { baseURI: args.file.replace(/\/?[^\/]+$/, '/') }
      })
      editor.setSize(null, '100%')

      var options = {}
      for (let k in HyperMD.Core.defaults.suggestedEditorConfig) {
        if (!/^hmd/.test(k)) continue
        options[k] = deepClone(editor.getOption(k))
        this.$watch("options." + k, v => { editor.setOption(k, deepClone(v)) }, { deep: true })
      }
      this.options = options

      fetch_text(args.file).then(text => editor.setValue(text))
    },
    el: "#app",
  })
  window.$vm = $vm
})
