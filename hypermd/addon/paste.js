// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/hypermd/LICENSE
//
// make paste great again
//
// NOTE: using ECMAScript6. Only supports the newest modern browsers.
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

  function BogusTextNode(textContent) {
    this.textContent = textContent
  }
  BogusTextNode.prototype.nodeType = 99

  /** 
   * get one element's wrapping stuff.
   * ```
   *   <b>  => {start: "**", end: "**"}
   *   <h2> => {start: "## "} 
   *   <script> => {skip: true}
   * ```
   * 
   * @param {HTMLElement} ele
   * @return {{start?:string, end?:string, skip?:boolean}}
   */
  function getStartAndEnd(ele) {
    if (ele.nodeType != 1) return {}
    var tagName = ele.tagName.toLowerCase()

    var LI_ATTR_INDENT = "data-paste-indent"
    var LI_ATTR_INDEX = "data-paste-index"

    if (/^(?:i|em)$/.test(tagName)) return { start: "*", end: "*" }
    if (/^(?:del|s|strike)$/.test(tagName)) return { start: "~~", end: "~~" }
    if (/^(?:b|strong)$/.test(tagName)) return { start: "**", end: "**" }
    if (/^h\d$/.test(tagName)) return { start: "\n######".substr(0, 1 + ~~tagName.charAt(1)) + " ", end: "\n\n" }
    if ("pre" === tagName) return { start: "\n\n```\n" + ele.textContent + "\n```\n\n", skip: true }
    if ("code" === tagName && ele.parentElement.tagName !== "PRE") return { start: "`", end: "`" }
    if ("blockquote" === tagName) return { start: "\n\n> ", end: "\n\n" }
    if ("br" === tagName) return { start: "\n" }

    if ("table" === tagName) {
      if (!ele.textContent.trim()) return { skip: true }
      return { start: "\n\n", end: "\n\n" }
    }
    if ("tr" === tagName) {
      var end = "\n"
      if (ele == ele.parentElement.firstElementChild) {
        var ths = ele.children, i = 0, j = 0
        while (i < ths.length) {
          var th = ths[i++]
          j += ~~th.getAttribute('colspan') + 1
        }

        while (j--) {
          end += "|:----:"
        }
        end += "|\n"
      }
      return { start: "| ", end: end }
    }
    if (/^t[dh]$/.test(tagName)) return { end: " | " }

    if (
      /^(?:p|div)$/.test(tagName) &&
      ele.textContent.trim().length
    ) {
      return { start: "\n", end: "\n" }
    }

    if ("img" === tagName) {
      var alt = ele.getAttribute("alt") || '',
        url = ele.getAttribute("src") || '',
        title = ele.getAttribute("title")
      if (title) url += ' "' + title.replace(/([\(\)\"])/g, '\\$1') + '"'
      return { start: "![" + alt + "](" + url + ")" }
    }

    if ("a" === tagName) {
      var url = ele.getAttribute("href") || '',
        title = ele.getAttribute("title")
      if (title) url += ' "' + title.replace(/([\(\)\"])/g, '\\$1') + '"'
      return { start: "[", end: "](" + url + ")" }
    }

    if (/^[uo]l$/.test(tagName)) {
      var lis = ele.querySelectorAll("li")
      for (var i = 0; i < lis.length; i++) {
        var li = lis[i]
        li.setAttribute(LI_ATTR_INDENT, ~~li.getAttribute(LI_ATTR_INDENT))
      }

      lis = ele.children
      if ('ol' === tagName) {
        for (var i = 0; i < lis.length;) {
          li = lis[i++]
          li.setAttribute(LI_ATTR_INDEX, i + ". ")
        }
      }
      return { start: "\n\n", end: "\n\n" }
    }

    if ('li' === tagName) {
      var
        indent = ~~ele.getAttribute(LI_ATTR_INDENT),
        index = ele.getAttribute(LI_ATTR_INDEX) || " - "
      return { start: "         ".substr(0, indent * 2) + index, end: "\n" }
    }

    return {}
  }

  /**
   * parse HTML and translate into Markdown
   * 
   * @param {string} html
   * @returns {string}
   */
  function html2md(html) {
    var doc = new DOMParser().parseFromString(html, 'text/html')

    // once data is fetched, codemirror.js:7554 will get nothing.

    var result = ""
    var queue = [doc.body]

    while (queue.length) {
      var node = queue.shift()

      switch (node.nodeType) {
        case 1: // Element
          var se = getStartAndEnd(node)
          if (se.start) result += se.start
          if (!se.skip) {
            var childNodes = [].slice.call(node.childNodes)
            childNodes.splice(0, 0, 0, 0)
            if (se.end) childNodes.push(new BogusTextNode(se.end));
            [].splice.apply(queue, childNodes)
          }
          break
        case 3: // Text
          result += node.textContent
            .replace(/^[\s\n\r]{2,}/, ' ')
            .replace(/[\s\n\r]{2,}$/, ' ')
            .replace(/([\_\(\)\"\-\*\<\[\]\+\`\$\\])/g, "\\$1")
          break
        case 99: // BogusTextNode
          result += node.textContent
          break
      }

      // remove redundant LFs
      result = result.replace(/\n{3,}/, "\n\n")
    }

    return result.trim()
  }

  /** 
   * 'paste' event handler
   * 
   * @param {ClipboardEvent} ev 
   */
  Paste.prototype.pasteHandle = function (cm, ev) {
    var cd = ev.clipboardData
    if (!cd || cd.types.indexOf('text/html') == -1) return
    var result = html2md(cd.getData('text/html'))

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