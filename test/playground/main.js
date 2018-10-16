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

var defaultTheme = "hypermd-light"
var themeCSSLink = elt("link", { rel: 'stylesheet', href: '/theme/' + (args.theme || defaultTheme) + '.css' })
document.body.appendChild(themeCSSLink)

var dependencies = [
  'hypermd',
  'vue',

  'playground/component/vue-float-win',
  'playground/component/option-input',
  'playground/component/option-fieldset',
]

for (let k of args.plugins.trim().split(";")) {
  let mat = k.trim().split(/\s*=\s*/, 2)
  let [name, main] = mat
  if (!main) main = 'index.js'
  console.log("Plugin: found " + name + " with main-entry: " + main)
  requirejs.config({ packages: [{ name, main }] })
  dependencies.push(name)
}

require(dependencies, function (hypermd_0, vue_0) {
  HyperMD = hypermd_0, Vue = vue_0

  var $vm = new Vue({
    data() {
      return {
        windows: {
          options: false,
          plugins: false,
        },
        originalOptions: {},
        options: null, // defined later

        file: args.file,
        plugins: args.plugins,

        plugins_lined: args.plugins.replace(/;/g, '\n'),
      }
    },
    computed: {
      HyperMD() { return HyperMD },
      url() {
        var parts = []
        for (var name in defaultArgs) {
          if (this[name] !== defaultArgs[name]) parts.push(name + '=' + encodeURIComponent(args[name]))
        }

        var oopt = this.options && this.originalOptions || {}
        for (var name in oopt) {
          var ooptv = oopt[name]
          var noptv = this.options[name]
          if (ooptv === noptv) continue

          if (typeof noptv === 'object') {
            for (let k in noptv) {
              if (noptv[k] !== ooptv[k]) parts.push(name + '.' + k + '=' + encodeURIComponent(noptv[k]))
            }
          }

          if (typeof noptv === 'string') {
            parts.push(name + '=' + encodeURIComponent(noptv))
          }

          if (typeof noptv === "boolean") {
            parts.push(name + '=' + noptv)
          }
        }

        return '#' + parts.join('#')
      }
    },
    watch: {
      url(newURL) {
        location.hash = newURL
      },
    },
    methods: {
      set_theme(ev) {
        var theme = ev.target.value, self = this
        themeCSSLink.href = '/theme/' + theme + '.css?rand=' + Math.random()
        setTimeout(() => Vue.set(self.options, "theme", theme), 100)
      },
      refresh_page() {
        location.reload()
      },
      load_plugins() {
        this.plugins = args.plugins = this.plugins_lined.trim().split(/\s+/g).join(";")
        location.hash = this.url
        location.reload()
      },
    },
    mounted() {
      editor = HyperMD.fromTextArea(document.getElementById('my-textarea'), {
        hmdReadLink: { baseURI: args.file.replace(/\/?[^\/]+$/, '/') },
        mode: {
          name: "hypermd",
          hashtag: true,
        },
      })
      editor.setSize(null, '100%')

      const updateOriginalOptions = (name, value) => {
        if (name in this.originalOptions) return
        this.originalOptions[name] = deepClone(value)
      }

      for (let name in args) {
        if (['file', 'plugins'].indexOf(name) !== -1) continue

        let value = args[name]

        if (value === 'true') value = true
        if (value === 'false') value = false
        if (value === 'null') value = null
        if (/^{.*}$/.test(value)) value = JSON.parse(value)

        let [pname, sname] = name.split('.', 2) // "hmdFold" and "emoji"
        let opt = editor.getOption(pname)

        updateOriginalOptions(pname, opt)

        if (!sname) {
          if (value !== opt) editor.setOption(pname, value)
        } else {
          if (!opt) opt = {}
          opt[sname] = value
          editor.setOption(pname, opt)
        }
      }

      var options = {}
      for (let k in HyperMD.Core.defaults.suggestedEditorConfig) {
        if (!/^hmd|^(mode|theme)$/.test(k)) continue
        options[k] = deepClone(editor.getOption(k))
        updateOriginalOptions(k, options[k])
        this.$watch("options." + k, v => { editor.setOption(k, deepClone(v)) }, { deep: true })
      }
      this.options = options

      fetch_text(args.file).then(text => editor.setValue(text))
    },
    el: "#app",
  })
  window.$vm = $vm
}, displayRequireJSError)
