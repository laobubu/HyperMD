// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/hypermd/LICENSE
//
// hover on a link, showing related footnote
//

/* global marked */

(function (mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(
      require("codemirror/lib/codemirror"),
      require("marked/lib/marked"),
      require("./readlink")
    );
  else if (typeof define == "function" && define.amd) // AMD
    define([
      "codemirror/lib/codemirror",
      "marked/lib/marked",
      "./readlink"
    ], mod);
  else // Plain browser env
    mod(CodeMirror, marked);
})(function (CodeMirror, marked) {
  "use strict";

  var HMDHover = function (cm) {
    this.cm = cm

    var lineDiv = cm.display.lineDiv
    lineDiv.addEventListener("mouseenter", mouseenter.bind(this), true)
    this.lineDiv = lineDiv

    var tooltip = document.createElement("div"),
      tooltipContent = document.createElement("div"),
      tooltipIndicator = document.createElement("div")
    tooltip.setAttribute("style", "position:absolute;z-index:99")
    tooltip.setAttribute("class", "HyperMD-hover")
    tooltip.setAttribute("cm-ignore-events", "true")

    tooltipContent.setAttribute("class", "HyperMD-hover-content")
    tooltip.appendChild(tooltipContent)

    tooltipIndicator.setAttribute("class", "HyperMD-hover-indicator")
    tooltip.appendChild(tooltipIndicator)

    this.tooltipDiv = tooltip
    this.tooltipContentDiv = tooltipContent
    this.tooltipIndicator = tooltipIndicator
    this.xOffset = 10
  }

  function mouseenter(ev) {
    var cm = this.cm, target = ev.target
    var className = target.className
    if (target == this.tooltipDiv || (target.compareDocumentPosition && (target.compareDocumentPosition(this.tooltipDiv) & 8) == 8)) {
      return
    }

    if (!(
      target.nodeName == "SPAN" &&
      /cm-hmd-barelink\b/.test(className) &&
      !/cm-formatting\b/.test(className)
    )) {
      this.hideInfo()
      return
    }

    var pos = cm.coordsChar({ left: ev.clientX, top: ev.clientY })
    var url = target.textContent
    
    if (/cm-hmd-footref-lead/.test(className)) url = "^" + target.nextElementSibling.textContent
    else if (/cm-hmd-footref/.test(className)) url = "^" + url

    var footnote = cm.hmdReadLink(url, pos.line)
    if (!footnote) {
      this.hideInfo()
      return
    }

    this.showInfo(text2html(footnote.content), target)
  }

  /** if `marked` exists, use it; else, return safe html */
  function text2html(text) {
    if (typeof marked === 'function') return marked(text)
    return "<pre>" + text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/  /g, ' &nbsp;') + "</pre>"
  }

  HMDHover.prototype = {
    showInfo: function (html, relatedTo) {
      var b1 = relatedTo.getBoundingClientRect(), b2 = this.lineDiv.getBoundingClientRect(),
        tdiv = this.tooltipDiv, b3, xOffset = this.xOffset
      this.tooltipContentDiv.innerHTML = html
      tdiv.style.left = (b1.left - b2.left - xOffset) + 'px'
      this.lineDiv.appendChild(tdiv)

      b3 = tdiv.getBoundingClientRect()
      if (b3.right > b2.right) {
        xOffset = b3.right - b2.right
        tdiv.style.left = (b1.left - b2.left - xOffset) + 'px'
      }
      tdiv.style.top = (b1.top - b2.top - b3.height) + 'px'

      this.tooltipIndicator.style.marginLeft = xOffset + 'px'
    },
    hideInfo: function () {
      if (this.tooltipDiv.parentElement == this.lineDiv) {
        this.lineDiv.removeChild(this.tooltipDiv)
      }
    }
  }

  function init() {
    var cm = this
    if (!cm.hmd) cm.hmd = {}
    cm.hmd.hover = new HMDHover(cm)
  }

  CodeMirror.defineExtension("hmdHoverInit", init)
})