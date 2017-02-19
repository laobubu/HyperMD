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
   * get one element's wrapping stuff.
   * ```
   *   <b>  => {start: "**", end: "**"}
   *   <h2> => {start: "## "} 
   *   <script> => {skip: true}
   *   <blockquote> => { lead: "> "}
   * ```
   * 
   * 1. `lead` is the leading string for every Markdown line inside it.
   * 
   * @param {HTMLElement} ele
   * @return {{start?:string, end?:string, skip?:boolean, lead?:string}}
   */
  function getDecoration(ele) {
    if (ele.nodeType != 1) return {}
    var tagName = ele.tagName.toLowerCase()

    var LI_ATTR_INDENT = "data-paste-indent"
    var LI_ATTR_INDEX = "data-paste-index"

    if (
      /^(?:i|em|del|s|table|span|strike|b|strong|a|code)$/.test(tagName) &&
      !ele.querySelector('img')
    ) {
      var eleText = ele.textContent
      if (eleText == "\xA0") return { start: " ", skip: true } // &nbsp;
      if (eleText.trim().length == 0) return { skip: true }
    }

    if (/dp-highlighter/.test(ele.className)) {
      var lis = ele.querySelectorAll('ol li'), text = ""

      // get language (for CSDN blog)
      var lang = ele.querySelector('.tools')
      if (lang) lang = /^\s*\[(\w+)\]/.exec(lang.textContent)
      lang = lang ? lang[1] : ''

      for (var i = 0; i < lis.length; i++) text += lis[i].textContent.replace(/\s+$/, '') + "\n"
      return { start: "\n\n```" + lang + "\n" + text + "```\n\n", skip: true }
    }

    if (/^(?:script|comment)$/.test(tagName)) return { skip: true }
    if (/^(?:i|em)$/.test(tagName)) return { start: "*", end: "*" }
    if (/^(?:del|s|strike)$/.test(tagName)) return { start: "~~", end: "~~" }
    if (/^(?:b|strong)$/.test(tagName)) return { start: "**", end: "**" }
    if (/^h\d$/.test(tagName)) return { start: "\n######".substr(0, 1 + ~~tagName.charAt(1)) + " ", end: "\n\n" }
    if ("pre" === tagName) {
      var childClassName = ele.firstElementChild && ele.firstElementChild.className || ''
      var lang =
        /\b(?:highlight-source|language)-(\w+)/.exec(ele.parentElement.className) ||
        /\b(?:highlight-source|language)-(\w+)/.exec(ele.className) ||
        /\b(?:highlight-source|language)-(\w+)/.exec(childClassName) ||
        (/hljs/.test(ele.className + childClassName) && [0, childClassName.replace('hljs', '').trim()])
      lang = lang ? lang[1] : ''

      var text = ele.textContent + "\n"
      if (!ele.previousElementSibling || ele.previousElementSibling.tagName !== 'PRE')
        text = "\n\n```" + lang + "\n" + text
      if (!ele.nextElementSibling || ele.nextElementSibling.tagName !== 'PRE')
        text += "```\n\n"

      return { start: text, skip: true }
    }
    if ("code" === tagName && ele.parentElement.tagName !== "PRE") return { start: "`" + ele.textContent + "`", skip: true }
    if ("blockquote" === tagName) return { start: "\n\n", end: "\n\n", lead: "> " }
    if ("br" === tagName) return { start: "\n" }

    if ("table" === tagName) return { start: "\n\n", end: "\n\n" }
    if ("tr" === tagName) {
      var end = "\n"
      if (
        ele == ele.parentElement.firstElementChild &&  // first <tr> 
        ele.parentElement == ele.parentElement.parentElement.firstElementChild // <thead> or <tbody>
      ) {
        var ths = ele.children, i = 0, j = 0
        while (i < ths.length) {
          var th = ths[i++]
          j += ~~th.getAttribute('colspan') + 1
        }

        while (j--) {
          end += "| ------ "
        }
        end += "|\n"
      }
      return { start: "| ", end: end }
    }
    if (/^t[dh]$/.test(tagName)) return { end: " | " }

    if (
      /^(?:p|div)$/.test(tagName)
    ) {
      return { start: "\n", end: "\n" }
    }

    if ("img" === tagName) {
      var alt = ele.getAttribute("alt") || '',
        url = ele.getAttribute("src") || '',
        title = ele.getAttribute("title")
      if (title) url += ' "' + escape(title) + '"'
      return { start: "![" + alt + "](" + url + ")" }
    }

    if ("a" === tagName) {
      var url = ele.getAttribute("href") || '',
        title = ele.getAttribute("title")
      if (title) url += ' "' + escape(title) + '"'
      if (!url && !title) return {} // skip bookmarks?
      return { start: "[", end: "](" + url + ")" }
    }

    // lists should use `lead`, but may get unexcepted spaces...
    if (/^[uo]l$/.test(tagName)) {
      var lis = ele.querySelectorAll("li")
      for (var i = 0; i < lis.length; i++) {
        var li = lis[i]
        li.setAttribute(LI_ATTR_INDENT, 1 + ~~li.getAttribute(LI_ATTR_INDENT))
      }

      lis = ele.children
      if ('ol' === tagName) {
        for (var i = 0; i < lis.length;) {
          li = lis[i++]
          li.setAttribute(LI_ATTR_INDEX, i + ".")
        }
      }

      var isNestedList = /^(?:ul|ol|li)$/i.test(ele.parentElement.tagName)
      if (isNestedList) return { start: "\n", end: "\n" }
      return { start: "\n\n", end: "\n\n" }
    }

    if ('li' === tagName) {
      var
        indent = ele.getAttribute(LI_ATTR_INDENT) - 1,
        index = ele.getAttribute(LI_ATTR_INDEX) || "-"
      index = ' ' + index + ' '
      return { start: "                  ".substr(0, indent * 2) + index, end: "\n" }
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

    /** @type {{inside: HTMLElement, text:string}[]} */
    var leads = []

    while (queue.length) {
      var node = queue.shift()

      var lead = "", text = node.textContent
      for (var i = 0; i < leads.length; i++) {
        var relation = node.compareDocumentPosition(leads[i].inside)
        if (relation & 8) lead += leads[i].text // contained by
        else leads.splice(i--, 1) // out of this lead
      }

      switch (node.nodeType) {
        case 1: // Element
          var se = getDecoration(node)
          if (se.start) {
            result += lead ? se.start.replace(/(\n)/g, "$1" + lead) : se.start
          }
          if (se.lead) {
            leads.push({ inside: node, text: se.lead })
            result += se.lead
          }
          if (!se.skip) {
            var childNodes = [].slice.call(node.childNodes)
            childNodes.splice(0, 0, 0, 0)
            if (se.end) childNodes.push(new BogusTextNode(se.end, node));
            [].splice.apply(queue, childNodes)
          }
          break
        case 3: // Text
          text = escape(text.replace(/[\s\n\r]{2,}/, ' '))
        case 99: // BogusTextNode
          result += lead ? text.replace(/(\n)/g, "$1" + lead) : text
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
    var cd = ev.clipboardData || window.clipboardData
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