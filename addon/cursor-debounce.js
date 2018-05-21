/*!
 * HyperMD, copyright (c) by laobubu
 * Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
 *
 * Break the Wall between writing and preview, in a Markdown Editor.
 *
 * HyperMD makes Markdown editor on web WYSIWYG, based on CodeMirror
 *
 * Homepage: http://laobubu.net/HyperMD/
 * Issues: https://github.com/laobubu/HyperMD/issues
 */
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('codemirror'), require('../core')) :
  typeof define === 'function' && define.amd ? define(['exports', 'codemirror', '../core'], factory) :
  (factory((global.HyperMD = global.HyperMD || {}, global.HyperMD.CursorDebounce = {}),global.CodeMirror,global.HyperMD));
}(this, (function (exports,CodeMirror,core) { 'use strict';

  CodeMirror = CodeMirror && CodeMirror.hasOwnProperty('default') ? CodeMirror['default'] : CodeMirror;

  // HyperMD, copyright (c) by laobubu
  /********************************************************************************** */
  // Some parameter LGTM
  var silenceDuration = 100, distance = 5;
  /********************************************************************************** */
  /** ADDON OPTIONS */
  var OptionName = "hmdCursorDebounce";
  CodeMirror.defineOption(OptionName, false, function (cm, newVal) {
      var enabled = !!newVal;
      ///// apply config
      var inst = getAddon(cm);
      inst.ff_enable.setBool(enabled);
  });
  /********************************************************************************** */
  /** ADDON CLASS */
  var AddonAlias = "cursorDebounce";
  var CursorDebounce = function(cm) {
      var this$1 = this;

      // add your code here
      this.cm = cm;
      this.mouseDownHandler = function (cm, ev) {
          this$1.lastX = ev.clientX;
          this$1.lastY = ev.clientY;
          var supressor = this$1.mouseMoveSuppress;
          document.addEventListener("mousemove", supressor, true);
          if (this$1.lastTimeout)
              { clearTimeout(this$1.lastTimeout); }
          this$1.lastTimeout = setTimeout(function () {
              document.removeEventListener("mousemove", supressor, true);
              this$1.lastTimeout = null;
          }, silenceDuration);
      };
      this.mouseMoveSuppress = function (ev) {
          if ((Math.abs(ev.clientX - this$1.lastX) <= distance) && (Math.abs(ev.clientY - this$1.lastY) <= distance))
              { ev.stopPropagation(); }
      };
      this.ff_enable = new core.FlipFlop(
      /* ON  */ function () { cm.on('mousedown', this$1.mouseDownHandler); }, 
      /* OFF */ function () { cm.off('mousedown', this$1.mouseDownHandler); });
  };
  /** ADDON GETTER: Only one addon instance allowed in a editor */
  var getAddon = core.Addon.Getter(AddonAlias, CursorDebounce);

  exports.CursorDebounce = CursorDebounce;
  exports.getAddon = getAddon;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
