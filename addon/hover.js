(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('codemirror'), require('marked'), require('../core'), require('./read-link')) :
  typeof define === 'function' && define.amd ? define(['exports', 'codemirror', 'marked', '../core', './read-link'], factory) :
  (factory((global.HyperMD = global.HyperMD || {}, global.HyperMD.Hover = {}),global.CodeMirror,global.marked,null));
}(this, (function (exports,CodeMirror,marked,core) { 'use strict';

  CodeMirror = CodeMirror && CodeMirror.hasOwnProperty('default') ? CodeMirror['default'] : CodeMirror;
  marked = marked && marked.hasOwnProperty('default') ? marked['default'] : marked;

  // HyperMD, copyright (c) by laobubu
  /********************************************************************************** */
  /** STATIC METHODS */
  /** if `marked` exists, use it; else, return safe html */
  function text2html(text) {
      if (typeof marked === 'function')
          { return marked(text); }
      return "<pre>" + text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/  /g, ' &nbsp;') + "</pre>";
  }
  var defaultOption = {
      enabled: false,
      xOffset: 10,
  };
  var OptionName = "hmdHover";
  CodeMirror.defineOption(OptionName, false, function (cm, newVal) {
      var enabled = !!newVal;
      if (!enabled || typeof newVal === "boolean") {
          newVal = { enabled: enabled };
      }
      var newCfg = core.Addon.migrateOption(newVal, defaultOption);
      ///// apply config
      var inst = getAddon(cm);
      inst.ff_enable.setBool(newCfg.enabled);
      ///// write new values into cm
      for (var k in defaultOption)
          { inst[k] = newCfg[k]; }
  });
  /********************************************************************************** */
  /** ADDON CLASS */
  var AddonAlias = "hover";
  var Hover = function(cm) {
      var this$1 = this;

      this.cm = cm;
      var lineDiv = cm.display.lineDiv;
      this.lineDiv = lineDiv;
      var tooltip = document.createElement("div"), tooltipContent = document.createElement("div"), tooltipIndicator = document.createElement("div");
      tooltip.setAttribute("style", "position:absolute;z-index:99");
      tooltip.setAttribute("class", "HyperMD-hover");
      tooltip.setAttribute("cm-ignore-events", "true");
      tooltipContent.setAttribute("class", "HyperMD-hover-content");
      tooltip.appendChild(tooltipContent);
      tooltipIndicator.setAttribute("class", "HyperMD-hover-indicator");
      tooltip.appendChild(tooltipIndicator);
      this.tooltipDiv = tooltip;
      this.tooltipContentDiv = tooltipContent;
      this.tooltipIndicator = tooltipIndicator;
      var evhandler = this.mouseenter.bind(this);
      this.ff_enable = new core.FlipFlop(
      /* ON  */ function () { lineDiv.addEventListener("mouseenter", evhandler, true); }, 
      /* OFF */ function () { lineDiv.removeEventListener("mouseenter", evhandler, true); this$1.hideInfo(); });
  };
  Hover.prototype.mouseenter = function (ev) {
      var cm = this.cm, target = ev.target;
      var className = target.className;
      if (target == this.tooltipDiv || (target.compareDocumentPosition && (target.compareDocumentPosition(this.tooltipDiv) & 8) == 8)) {
          return;
      }
      if (target.nodeName !== "SPAN" || !/cm-hmd-barelink\b/.test(className)) {
          this.hideInfo();
          return;
      }
      var pos = cm.coordsChar({ left: ev.clientX, top: ev.clientY });
      var footnote = null;
      var range = core.expandRange(cm, pos, "hmd-barelink");
      if (range) {
          var text = cm.getRange(range.from, range.to);
          text = text.substr(1, text.length - 2);
          if (text)
              { footnote = cm.hmdReadLink(text, pos.line); }
      }
      if (!footnote) {
          this.hideInfo();
          return;
      }
      this.showInfo(text2html(footnote.content), target);
  };
  Hover.prototype.showInfo = function (html, relatedTo) {
      var b1 = relatedTo.getBoundingClientRect();
      var b2 = this.lineDiv.getBoundingClientRect();
      var tdiv = this.tooltipDiv;
      var xOffset = this.xOffset;
      this.tooltipContentDiv.innerHTML = html;
      tdiv.style.left = (b1.left - b2.left - xOffset) + 'px';
      this.lineDiv.appendChild(tdiv);
      var b3 = tdiv.getBoundingClientRect();
      if (b3.right > b2.right) {
          xOffset = b3.right - b2.right;
          tdiv.style.left = (b1.left - b2.left - xOffset) + 'px';
      }
      tdiv.style.top = (b1.top - b2.top - b3.height) + 'px';
      this.tooltipIndicator.style.marginLeft = xOffset + 'px';
  };
  Hover.prototype.hideInfo = function () {
      if (this.tooltipDiv.parentElement == this.lineDiv) {
          this.lineDiv.removeChild(this.tooltipDiv);
      }
  };
  var getAddon = core.Addon.Getter(AddonAlias, Hover, defaultOption);

  exports.text2html = text2html;
  exports.defaultOption = defaultOption;
  exports.Hover = Hover;
  exports.getAddon = getAddon;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
