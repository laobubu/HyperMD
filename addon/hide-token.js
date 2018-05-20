(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('codemirror'), require('../core')) :
  typeof define === 'function' && define.amd ? define(['exports', 'codemirror', '../core'], factory) :
  (factory((global.HyperMD = global.HyperMD || {}, global.HyperMD.HideToken = {}),global.CodeMirror,global.HyperMD));
}(this, (function (exports,CodeMirror,core) { 'use strict';

  CodeMirror = CodeMirror && CodeMirror.hasOwnProperty('default') ? CodeMirror['default'] : CodeMirror;

  // HyperMD, copyright (c) by laobubu
  var defaultOption = {
      enabled: false,
      tokenTypes: "em|strong|strikethrough|code|link".split("|"),
  };
  var OptionName = "hmdHideToken";
  CodeMirror.defineOption(OptionName, defaultOption, function (cm, newVal) {
      var enabled = !!newVal;
      if (!enabled || typeof newVal === "boolean") {
          newVal = { enabled: enabled };
      }
      else if (typeof newVal === "string") {
          newVal = { enabled: true, tokenTypes: newVal.split("|") };
      }
      else if (newVal instanceof Array) {
          newVal = { enabled: true, tokenTypes: newVal };
      }
      var newCfg = core.Addon.migrateOption(newVal, defaultOption);
      ///// apply config
      var inst = getAddon(cm);
      inst.ff_enable.setBool(newCfg.enabled);
      ///// write new values into cm
      for (var k in defaultOption)
          { inst[k] = newCfg[k]; }
  });
  //#endregion
  /********************************************************************************** */
  //#region Addon Class
  var hideClassName = "hmd-hidden-token";
  /**
   * 1. when renderLine, add "hmd-hidden-token" to each <span>
   * 2.
   */
  var HideToken = function(cm) {
      var this$1 = this;

      // options will be initialized to defaultOption (if exists)
      // add your code here
      this.cm = cm;
      this.renderLineHandler = function (cm, line, el) {
          this$1.procLine(line);
      };
      this.lastShown = [];
      this.cursorActivityHandler = function (doc) {
          this$1.recovery();
      };
      this.ff_enable = new core.FlipFlop(
      /* ON  */ function () {
          cm.on("cursorActivity", this$1.cursorActivityHandler);
          cm.on("renderLine", this$1.renderLineHandler);
      }, 
      /* OFF */ function () {
          cm.off("cursorActivity", this$1.cursorActivityHandler);
          cm.off("renderLine", this$1.renderLineHandler);
      });
  };
  HideToken.prototype.recovery = function () {
      var lastShown = this.lastShown;
      
      lastShown.splice(0);
  };
  HideToken.prototype.procLine = function (line) {
          var this$1 = this;

      var cm = this.cm;
      var lineNo = line.lineNo();
      var lv = core.cm_internal.findViewForLine(cm, lineNo);
      var mapInfo = core.cm_internal.mapFromLineView(lv, line, lineNo);
      var map = mapInfo.map;
      var nodeCount = map.length / 3;
      for (var idx = 0, i = 0; idx < nodeCount; idx++, i += 3) {
          var text = map[i + 2];
          var span = text.parentElement;
          if (text.nodeType !== Node.TEXT_NODE || !span)
              { continue; }
          var spanClass = span.className;
          for (var i$1 = 0, list = this$1.tokenTypes; i$1 < list.length; i$1 += 1) {
              var type = list[i$1];

                  if (type === 'link' && /cm-hmd-footref|cm-hmd-footnote|cm-hmd-barelink/.test(spanClass)) {
                  // ignore footnote names, footrefs, barelinks
                  continue;
              }
              if (spanClass.indexOf("cm-formatting-" + type + " ") !== -1) {
                  // found one! do hiding
                  span.className += " " + hideClassName;
                  break;
              }
          }
      }
  };
  //#endregion
  /** ADDON GETTER (Singleton Pattern): a editor can have only one MyAddon instance */
  var AddonAlias = "hideToken";
  var getAddon = core.Addon.Getter(AddonAlias, HideToken, defaultOption);

  exports.defaultOption = defaultOption;
  exports.HideToken = HideToken;
  exports.getAddon = getAddon;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
