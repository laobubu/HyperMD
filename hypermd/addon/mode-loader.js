// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/hypermd/LICENSE
//
// if a code-fence with CodeMirror-mode-not-loaded language is detected,
// load the mode and reHighlight the code-fence block
//

(function (mod) {
  var CODEMIRROR_ROOT = window.CODEMIRROR_ROOT || "codemirror/";
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(
      require(CODEMIRROR_ROOT + "lib/codemirror")
    );
  else if (typeof define == "function" && define.amd) // AMD
    define([
      CODEMIRROR_ROOT + "lib/codemirror"
    ], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function (CodeMirror) {
  "use strict";

  /**
   *
   * @constructor
   * @param {CodeMirror.Editor} cm
   */
  function ModeLoader(cm) {
    this.cm = cm
    this.source = "./node_modules/codemirror/" // url prefix

    this._loadingModes = {}
    this._rlHandler = this.rlHandler.bind(this)
    this._enabled = false
  }
  ModeLoader.prototype.enable = function () {
    if (this._enabled) return
    this._enabled = true
    this.cm.on("renderLine", this._rlHandler)
  }
  ModeLoader.prototype.disable = function () {
    if (!this._enabled) return
    this._enabled = false
    this.cm.off("renderLine", this._rlHandler)
  }
  /**
   * trig a "change" event on one line
   * @param {number} lineNo
   */
  ModeLoader.prototype.touchLine = function (lineNo) {
    var line = this.cm.getLineHandle(lineNo)
    var lineLen = line.text.length
    this.cm.replaceRange(
      line.text.charAt(lineLen - 1),
      { line: lineNo, ch: lineLen - 1 },
      { line: lineNo, ch: lineLen }
    )
  }
  /**
   * load a mode, then refresh editor
   *
   * @param {string} mode
   * @param {number} line >=0 : add into waiting queue    <0 : load and retry up to `-line` times
   */
  ModeLoader.prototype.startLoadMode = function (mode, line) {
    var linesWaiting = this._loadingModes
    var self = this

    if (line >= 0 && mode in linesWaiting) {
      linesWaiting[mode].push(line)
      return
    }

    // start load a mode
    if (line >= 0) linesWaiting[mode] = [line]

    var successCb = function () {
      console.log("[HyperMD] mode-loader loaded " + mode)
      self.cm.operation(function () {
        for (var i = 0; i < linesWaiting[mode].length; i++) {
          self.touchLine(linesWaiting[mode][i])
        }
      })
      delete linesWaiting[mode]
    }

    var errorCb = function () {
      console.warn("[HyperMD] mode-loader failed to load mode " + mode + " from ", url)
      if (line === -1) {
        // no more chance
        return
      }

      console.log("[HyperMD] mode-loader will retry loading " + mode)
      setTimeout(function () {
        self.startLoadMode(mode, line >= 0 ? -3 : (line + 1))
      }, 1000)
    }

    var url = this.source + "mode/" + mode + "/" + mode + ".js"

    if (typeof requirejs === 'function' && url.charAt(0) === "~") {
      // require.js
      requirejs([
        url.slice(1, -3),
      ], successCb)
    } else {
      // trandition loadScript
      var script = document.createElement('script');
      script.onload = successCb
      script.onerror = errorCb
      script.src = url
      document.head.appendChild(script)
    }
  }
  /**
   * CodeMirror "renderLine" event handler
   * @param {CodeMirror.Editor} cm
   * @param {CodeMirror.LineHandle} line
   */
  ModeLoader.prototype.rlHandler = function (cm, line) {
    var lineNo = line.lineNo()
    var text = line.text || "", mat = text.match(/^```\s*(\S+)/)
    if (mat) { // seems found one code fence
      var lang = mat[1]
      var modeInfo = CodeMirror.findModeByName(lang)
      var modeName = modeInfo && modeInfo.mode
      if (modeName && !(modeName in CodeMirror.modes)) {
        // a not-loaded mode is found!
        // now we shall load mode `modeName`
        this.startLoadMode(modeName, lineNo)
      }
    }
  }

  function getModeLoader(cm) {
    if (!cm.hmd) cm.hmd = {}
    if (!cm.hmd.modeLoader) cm.hmd.modeLoader = new ModeLoader(cm)
    return cm.hmd.modeLoader
  }

  CodeMirror.defineOption("hmdLoadModeFrom", false, function (cm, newVal, oldVal) {
    var loader = getModeLoader(cm)
    if (oldVal == 'CodeMirror.Init') oldVal = false

    loader.source = newVal
    if (!oldVal ^ !newVal) {
      newVal ? loader.enable() : loader.disable()
    }
  })
})