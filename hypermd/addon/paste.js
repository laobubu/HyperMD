// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/hypermd/LICENSE
//
// make paste great again
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



  function Paste(cm) {
    this.cm = cm
    this._pasteHandle = this.pasteHandle.bind(this)
  }

  function BogusTextNode(textContent, proxy) {
    this.textContent = textContent
    this.proxy = proxy
  }
  BogusTextNode.prototype.nodeType = 99
  BogusTextNode.prototype.compareDocumentPosition = function (node) {
    return this.proxy.compareDocumentPosition(node)
  }

  /**
   * add slash for some chars
   * 
   * @param {string} str
   * @returns {string}
   */
  function escape(str) {
    return str.replace(/([\_\(\*\<\[\+\`\$\\])/g, "\\$1")
  }

  /**
   * function that used to translate HTML into Markdown
   * 
   * @type {(html:string)=>string}
   */
  var html2md = null

  if (typeof TurndownService === 'function') {
    // using npm library `turndown`
    html2md = (function () {
      var opts = {
        "headingStyle": "atx",
        "hr": "---",
        "bulletListMarker": "*",
        "codeBlockStyle": "fenced",
        "fence": "```",
        "emDelimiter": "*",
        "strongDelimiter": "**",
        "linkStyle": "inlined",
        "linkReferenceStyle": "collapsed"
      }
      var turndownService = new TurndownService(opts)

      if (typeof turndownPluginGfm !== 'undefined') {
        turndownService.use(turndownPluginGfm.gfm)
      }

      return function (html) {
        return turndownService.turndown(html)
      }
    })()
  } else {
    //TODO: set `html2md` with other converter here
  }

  /** 
   * 'paste' event handler
   * 
   * @param {ClipboardEvent} ev 
   */
  Paste.prototype.pasteHandle = function (cm, ev) {
    var cd = ev.clipboardData || window.clipboardData
    if (!html2md || !cd || cd.types.indexOf('text/html') == -1) return
    var result = html2md(cd.getData('text/html'))
    if (!result) return

    cm.operation(cm.replaceSelection.bind(cm, result))

    ev.preventDefault()
  }
  Paste.prototype.bind = function () { this.cm.on('paste', this._pasteHandle) }
  Paste.prototype.unbind = function () { this.cm.off('paste', this._pasteHandle) }

  /** get Paste instance of `cm`. if not exists, create one. */
  function getPaste(cm) {
    if (!cm.hmd) cm.hmd = {}
    else if (cm.hmd.paste) return cm.hmd.paste

    var paste = new Paste(cm)
    cm.hmd.paste = paste
    return paste
  }

  CodeMirror.defineOption("hmdPaste", false, function (cm, newVal, oldVal) {
    // complete newCfg with default values
    var paste = getPaste(cm)
    if (oldVal == 'CodeMirror.Init') oldVal = false

    if (!oldVal ^ !newVal) {
      newVal ? paste.bind() : paste.unbind()
    }
  })
})