(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('codemirror'), require('../core'), require('codemirror/mode/meta')) :
  typeof define === 'function' && define.amd ? define(['exports', 'codemirror', '../core', 'codemirror/mode/meta'], factory) :
  (factory((global.HyperMD = global.HyperMD || {}, global.HyperMD.ModeLoader = {}),global.CodeMirror,global.HyperMD));
}(this, (function (exports,CodeMirror,core) { 'use strict';

  CodeMirror = CodeMirror && CodeMirror.hasOwnProperty('default') ? CodeMirror['default'] : CodeMirror;

  // HyperMD, copyright (c) by laobubu
  /********************************************************************************** */
  /** ADDON OPTIONS */
  var OptionName = "hmdLoadModeFrom";
  CodeMirror.defineOption(OptionName, false, function (cm, newVal) {
      var enabled = !!newVal;
      ///// apply config
      var inst = getAddon(cm);
      inst.ff_enable.setBool(enabled);
      inst.source = newVal;
  });
  /********************************************************************************** */
  /** ADDON CLASS */
  var AddonAlias = "modeLoader";
  var ModeLoader = function(cm) {
      var this$1 = this;

      // add your code here
      this.cm = cm;
      this.source = "./node_modules/codemirror/"; // url prefix
      this._loadingModes = {};
      /**
       * CodeMirror "renderLine" event handler
       */
      this.rlHandler = function (cm, line) {
          var lineNo = line.lineNo();
          var text = line.text || "", mat = text.match(/^```\s*(\S+)/);
          if (mat) { // seems found one code fence
              var lang = mat[1];
              var modeInfo = CodeMirror.findModeByName(lang);
              var modeName = modeInfo && modeInfo.mode;
              if (modeName && !(modeName in CodeMirror.modes)) {
                  // a not-loaded mode is found!
                  // now we shall load mode `modeName`
                  this$1.startLoadMode(modeName, lineNo);
              }
          }
      };
      this.ff_enable = new core.FlipFlop(
      /* ON  */ function () { cm.on("renderLine", this$1.rlHandler); }, 
      /* OFF */ function () { cm.off("renderLine", this$1.rlHandler); });
  };
  /** trig a "change" event on one line */
  ModeLoader.prototype.touchLine = function (lineNo) {
      var line = this.cm.getLineHandle(lineNo);
      var lineLen = line.text.length;
      this.cm.replaceRange(line.text.charAt(lineLen - 1), { line: lineNo, ch: lineLen - 1 }, { line: lineNo, ch: lineLen });
  };
  /**
   * load a mode, then refresh editor
   *
   * @param  mode
   * @param  line >=0 : add into waiting queue<0 : load and retry up to `-line` times
   */
  ModeLoader.prototype.startLoadMode = function (mode, line) {
      var linesWaiting = this._loadingModes;
      var self = this;
      if (line >= 0 && mode in linesWaiting) {
          linesWaiting[mode].push(line);
          return;
      }
      // start load a mode
      if (line >= 0)
          { linesWaiting[mode] = [line]; }
      var successCb = function () {
          console.log("[HyperMD] mode-loader loaded " + mode);
          var lines = linesWaiting[mode];
          self.cm.operation(function () {
              for (var i = 0; i < lines.length; i++) {
                  self.touchLine(lines[i]);
              }
          });
          delete linesWaiting[mode];
      };
      var errorCb = function () {
          console.warn("[HyperMD] mode-loader failed to load mode " + mode + " from ", url);
          if (line === -1) {
              // no more chance
              return;
          }
          console.log("[HyperMD] mode-loader will retry loading " + mode);
          setTimeout(function () {
              self.startLoadMode(mode, line >= 0 ? -3 : (line + 1));
          }, 1000);
      };
      var url = this.source + "mode/" + mode + "/" + mode + ".js";
      if (typeof requirejs === 'function' && url.charAt(0) === "~") {
          // require.js
          requirejs([
              url.slice(1, -3) ], successCb);
      }
      else {
          // trandition loadScript
          var script = document.createElement('script');
          script.onload = successCb;
          script.onerror = errorCb;
          script.src = url;
          document.head.appendChild(script);
      }
  };
  /** ADDON GETTER: Only one addon instance allowed in a editor */
  var getAddon = core.Addon.Getter(AddonAlias, ModeLoader);

  exports.ModeLoader = ModeLoader;
  exports.getAddon = getAddon;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
