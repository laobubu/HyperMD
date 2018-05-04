// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/hypermd/LICENSE
//
// Provides HyperMD **base functions**
//

(function (mod) {

  if (typeof exports == "object" && typeof module == "object") // CommonJS
    module.exports = mod(
      require("codemirror/lib/codemirror")
    )
  else if (typeof define == "function" && define.amd) // AMD
    define([
      "codemirror/lib/codemirror",
    ], mod)
  else // Plain browser env
    window.HyperMD = mod(window.CodeMirror)
})(function (CodeMirror) {

  /**
   * Simple FlipFlop
   * 
   * @param {function} on_cb 
   * @param {function} off_cb 
   * @param {any} [initStatus] default: false (boolean)
   * @param {string} [subkey] if get an object, use this key to retrive status. default: "enabled"
   */
  function FlipFlop(on_cb, off_cb, initStatus, subkey) {
    this.on_cb = on_cb
    this.off_cb = off_cb
    this.status = typeof initStatus === 'undefined' ? false : initStatus
    this.subkey = subkey || "enabled"
  }

  /**
   * Update FlipFlop status, and trig callback function if needed
   * 
   * @param {any} status new status value. can be a object
   * @param {boolean} [toBool] convert retrived value to boolean. default: false 
   */
  FlipFlop.prototype.set = function (status, toBool) {
    var newVal = typeof status === 'object' ? status[this.subkey] : status
    if (toBool) newVal = !!newVal
    if (newVal === this.status) return
    if (this.status = newVal) this.on_cb(this)
    else this.off_cb(this)
  }

  FlipFlop.prototype.setBool = function (status) {
    return this.set(status, true)
  }

  var HyperMD = {
    /**
     * Initialize an editor from a <textarea>
     * Calling `CodeMirror.fromTextArea` with recommended HyperMD options
     * 
     * @see CodeMirror.fromTextArea
     * 
     * @param {HTMLTextAreaElement} textArea
     * @param {object} [config]
     * @returns {CodeMirror.EditorFromTextArea}
     */
    fromTextArea: function (textArea, config) {
      var final_config = {
        lineNumbers: true,
        lineWrapping: true,
        theme: "hypermd-light",
        mode: "text/x-hypermd",
        tabSize: 4, // CommonMark specifies tab as 4 spaces

        foldGutter: true,
        gutters: [
          "CodeMirror-linenumbers",
          "CodeMirror-foldgutter",
          "HyperMD-goback"  // (addon: click) 'back' button for footnotes
        ],
        extraKeys: {
          "Enter": "newlineAndIndentContinueMarkdownList"
        },

        // (addon) cursor-debounce
        // cheap mouse could make unexpected selection. use this to fix.
        hmdCursorDebounce: true,

        // (addon) fold
        // turn images and links into what you want to see
        hmdAutoFold: 200,

        // (addon) fold-math
        // MathJax support. Both `$` and `$$` are supported
        hmdFoldMath: {
          interval: 200,      // auto folding interval
          preview: true       // providing a preview while composing math
        },

        // (addon) paste
        // copy and paste HTML content
        // NOTE: only works when `turndown` is loaded before HyperMD
        hmdPaste: true,

        // (addon) paste-image
        // copy, paste and upload image
        // if you don't need this, passing `false` as option value
        hmdPasteImage: {
          enabled: true,     // paste image
          enabledDrop: true, // drag'n'drop image file
          /** `uploadTo` can be 
           * 1. name of a built-in uploader (see addon/paste-image.js)
           * 2. function(File, callback) where file is Blob object and callback is function(imageURL, errorMsg)
           * 3. function(File) that returns Promise<string> 
           */
          uploadTo: 'sm.ms',
          placeholderURL: '<BlobURL>?HyperMD-Uploading', // see hypermd-light theme
        },

        // (addon) hide-token
        // hide/show Markdown tokens like `**`
        hmdHideToken: "(profile-1)",

        // (addon) mode-loader
        // auto load mode to highlight code blocks
        // by providing a URL prefix, pointing to your CodeMirror
        // - http://cdn.xxxxx.com/codemirror/v4.xx/
        // - ./node_modules/codemirror/              <- relative to webpage's URL
        // using require.js? do it like this :
        hmdLoadModeFrom: "~codemirror/",

        // (addon) table-align
        // adjust table separators' margin, making table columns aligned
        hmdTableAlign: {
          lineColor: '#999',   // color of vertical lines
          rowsepColor: '#999',  // color of the horizontal line, can be null (means transparent)
        },
      }

      if (typeof config === 'object') {
        for (var key in config) {
          if (config.hasOwnProperty(key)) {
            final_config[key] = config[key]
          }
        }
      }

      var cm = CodeMirror.fromTextArea(textArea, final_config)

      // (addon) hover
      // (dependencies) addon/readlink
      // tooltips on footnotes
      if (typeof cm['hmdHoverInit'] === 'function') cm.hmdHoverInit()

      // (addon) click
      // (dependencies) addon/readlink
      // click to follow links and footnotes
      if (typeof cm['hmdClickInit'] === 'function') cm.hmdClickInit()

      return cm
    },

    /**
     * Turn HyperMD editor into to a normal editor
     * 
     * Disable HyperMD visual effects. 
     * Interactive addons like click or paste are not affected.
     * 
     * @param {CodeMirror.EditorFromTextArea} editor Created by **HyperMD.fromTextArea**
     * @param {string} [theme]
     */
    switchToNormal: function (editor, theme) {
      editor.setOption('theme', theme || "default")

      // stop auto folding
      editor.setOption('hmdAutoFold', 0)
      editor.setOption('hmdFoldMath', false)

      // unfold all folded parts
      setTimeout(function () {
        var marks = editor.getAllMarks()
        for (var i = 0; i < marks.length; i++) {
          var mark = marks[i]
          if (/^hmd-/.test(mark.className)) mark.clear()
        }
      }, 200) // FIXME: the timeout is not determined

      // stop hiding tokens
      editor.setOption('hmdHideToken', '')

      // stop aligining table columns
      editor.setOption('hmdTableAlign', false)
    },

    /**
     * Revert what `HyperMD.switchToNormal` does
     * 
     * @param {CodeMirror.EditorFromTextArea} editor Created by **HyperMD.fromTextArea**
     * @param {string} [theme]
     */
    switchToHyperMD: function (editor, theme) {
      editor.setOption('theme', theme || 'hypermd-light')
      editor.setOption('hmdAutoFold', 200)
      editor.setOption('hmdFoldMath', { interval: 200, preview: true })
      editor.setOption('hmdHideToken', '(profile-1)')
      editor.setOption('hmdTableAlign', { lineColor: '#999', rowsepColor: '#999' })
    },

    /**
     * CodeMirror's `getLineTokens` might merge adjacent chars with same styles,
     * but this one won't.
     *
     * This one will consume more memory.
     *
     * @param {CodeMirror.LineHandle} line
     * @returns {string[]} every char's style
     */
    getEveryCharToken: function (line) {
      var ans = new Array(line.text.length)
      var ss = line.styles
      var i = 0

      if (ss) {
        // CodeMirror already parsed this line. Use cache
        for (var j = 1; j < ss.length; j += 2) {
          var i_to = ss[j], s = ss[j + 1]
          while (i < i_to) ans[i++] = s
        }
      } else {
        // Emmm... slow method
        var cm = line.parent.cm || line.parent.parent.cm || line.parent.parent.parent.cm
        ss = cm.getLineTokens(line.lineNo())
        for (var j = 0; j < ss.length; j++) {
          var i_to = ss[j].end, s = ss[j].type
          while (i < i_to) ans[i++] = s
        }
      }
      return ans
    },

    /**
     * After load a new mode (programming language),
     * call this to update all Markdown code-fences' apperance
     *
     * @param {CodeMirror.Editor} cm
     * @param {RegExp} [testRE] (optional) a regexp that matches code-fence's beginning line
     */
    reHighlight: function (cm, testRE) {
      if (!testRE) testRE = /^```\s*\S/
      cm.eachLine(function (line) {
        if (testRE.test(line.text)) {
          // found a beginning of code block
          // make a "change" event on this line, and re-highlighting
          var lineNo = line.lineNo()
          var lineLen = line.text.length
          cm.replaceRange(
            line.text.charAt(lineLen - 1),
            { line: lineNo, ch: lineLen - 1 },
            { line: lineNo, ch: lineLen }
          )
        }
      })
    },

    /**
     * execute a function, and async retry if it doesn't returns true
     */
    tryToRun: function (fn, times) {
      times = ~~times || 5
      var delayTime = 250

      function nextCycle() {
        if (!times--) return

        try { if (fn()) return }
        catch (e) { }

        setTimeout(nextCycle, delayTime)
        delayTime *= 2
      }

      setTimeout(nextCycle, 0)
    },

    /**
     * make a debounced function
     *
     * @param {function} fn
     * @param {number} delay in ms
     */
    debounce: function (fn, delay) {
      var deferTask = 0
      var notClearBefore = 0
      var run = function () { fn(); deferTask = 0; }
      var ans = function () {
        var nowTime = +new Date()
        if (deferTask) {
          if (nowTime < notClearBefore) return
          else clearTimeout(deferTask)
        }
        deferTask = setTimeout(run, delay)
        notClearBefore = nowTime + 100  // allow 100ms error
      }
      ans.stop = function () {
        if (!deferTask) return
        clearTimeout(deferTask)
        deferTask = 0
      }

      return ans
    },

    /**
     * Simple FlipFlop class with callback
     */
    FlipFlop: FlipFlop,

    /**
     * clean line measure caches (if needed) 
     * and re-position cursor
     * 
     * partially extracted from codemirror.js : function updateSelection(cm)
     * 
     * @param {CodeMirror.Editor} cm
     * @param {boolean} skipCacheCleaning
     */
    updateCursorDisplay: function (cm, skipCacheCleaning) {
      if (!skipCacheCleaning) {
        // // only process affected lines?
        // var lines = []
        // var vfrom = cm.display.viewFrom, vto = cm.display.viewTo
        // var selections = cm.listSelections()
        // var line
        // for (var i = 0; i < selections.length; i++) {
        //   line = selections[i].head.line; if (line >= vfrom && line <= vto && lines.indexOf(line) === -1) lines.push(line)
        //   line = selections[i].anchor.line; if (line >= vfrom && line <= vto && lines.indexOf(line) === -1) lines.push(line)
        // }

        var lvs = cm.display.view // LineView s
        for (var i = 0; i < lvs.length; i++) {
          // var j = lines.indexOf(lvs[i].line.lineNo())
          // if (j === -1) continue

          if (lvs[i].measure) lvs[i].measure.cache = {}
        }
      }

      setTimeout(function () {
        cm.display.input.showSelection(cm.display.input.prepareSelection())
      }, 60) // wait for css style
    },
  }
  return HyperMD
})
