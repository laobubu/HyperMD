(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('codemirror'), require('../core')) :
  typeof define === 'function' && define.amd ? define(['exports', 'codemirror', '../core'], factory) :
  (factory((global.HyperMD = global.HyperMD || {}, global.HyperMD.ReadLink = {}),global.CodeMirror,null));
}(this, (function (exports,CodeMirror,core) { 'use strict';

  CodeMirror = CodeMirror && CodeMirror.hasOwnProperty('default') ? CodeMirror['default'] : CodeMirror;

  // HyperMD, copyright (c) by laobubu
  var ReadLink = function(cm) {
      var this$1 = this;

      this.cm = cm;
      this.cache = {};
      cm.on("changes", core.debounce(function () { return this$1.rescan(); }, 500));
      this.rescan();
  };
  /**
   * get link footnote content like
   *
   * ```markdown
   *  [icon]: http://laobubu.net/icon.png
   * ```
   *
   * @param footNoteName case-insensive name, without "[" or "]"
   * @param line     current line. if not set, the first definition will be returned
   */
  ReadLink.prototype.read = function (footNoteName, line) {
      var defs = this.cache[footNoteName.trim().toLowerCase()] || [];
      var def;
      if (typeof line !== "number")
          { line = 1e9; }
      for (var i = 0; i < defs.length; i++) {
          def = defs[i];
          if (def.line > line)
              { break; }
      }
      return def;
  };
  /**
   * Scan content and rebuild the cache
   */
  ReadLink.prototype.rescan = function () {
      var cm = this.cm;
      var cache = (this.cache = {});
      cm.eachLine(function (line) {
          var txt = line.text, mat = /^(?:>\s+)*>?\s{0,3}\[([^\]]+)\]:\s*(.+)$/.exec(txt);
          if (mat) {
              var key = mat[1].trim().toLowerCase(), content = mat[2];
              if (!cache[key])
                  { cache[key] = []; }
              cache[key].push({
                  line: line.lineNo(),
                  content: content,
              });
          }
      });
  };
  /** HYPERMD ADDON DECLARATION */
  var AddonAlias = "readLink";
  var AddonClassCtor = ReadLink;
  var getAddon = core.Addon.Getter(AddonAlias, AddonClassCtor);
  /** HYPERMD HELPER DECLARATION */
  var HelperName = "hmdReadLink";
  var HelperObject = function (footNoteName, line) {
      return getAddon(this).read(footNoteName, line);
  };
  CodeMirror.defineExtension(HelperName, HelperObject);

  exports.ReadLink = ReadLink;
  exports.getAddon = getAddon;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
