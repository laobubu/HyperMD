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
  (factory((global.HyperMD = global.HyperMD || {}, global.HyperMD.ReadLink = {}),global.CodeMirror,global.HyperMD));
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
  function readLink(footNoteName, line) {
      return getAddon(this).read(footNoteName, line);
  }
  /**
   *
   * @param content eg. `http://laobubu.net/page "The Page"` or just a URL
   */
  function splitLink(content) {
      // remove title part (if exists)
      content = content.trim();
      var url = content, title = "";
      var mat = content.match(/^(\S+)\s+("(?:[^"\\]+|\\.)+"|[^"\s].*)/);
      if (mat) {
          url = mat[1];
          title = mat[2];
          if (title.charAt(0) === '"')
              { title = title.substr(1, title.length - 2).replace(/\\"/g, '"'); }
      }
      return { url: url, title: title };
  }
  CodeMirror.defineExtension("hmdReadLink", readLink);
  CodeMirror.defineExtension("hmdSplitLink", splitLink);

  exports.ReadLink = ReadLink;
  exports.getAddon = getAddon;
  exports.splitLink = splitLink;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
