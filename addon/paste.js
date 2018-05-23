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
  (factory((global.HyperMD = global.HyperMD || {}, global.HyperMD.Paste = {}),global.CodeMirror,global.HyperMD));
}(this, (function (exports,CodeMirror,core) { 'use strict';

  CodeMirror = CodeMirror && CodeMirror.hasOwnProperty('default') ? CodeMirror['default'] : CodeMirror;

  // HyperMD, copyright (c) by laobubu
  var getTurndownService = (function () {
      var service = null;
      return function () {
          if (!service && typeof TurndownService === 'function') {
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
              };
              service = new TurndownService(opts);
              if (typeof turndownPluginGfm !== 'undefined') {
                  service.use(turndownPluginGfm.gfm);
              }
          }
          return service;
      };
  })();
  var defaultConvertor = function (html) {
      // strip <a> without href
      html = html.replace(/<a([^>]*)>(.*?)<\/a>/ig, function (s, attrs, content) {
          if (!/href=/i.test(attrs))
              { return content; }
          return s;
      });
      // maybe you don't need to convert, if there is no img/link/header...
      if (!/\<(?:(?:hr|img)|\/(?:h\d|strong|em|strikethrough|a|b|i|del)\>)/i.test(html))
          { return null; }
      var turndownService = getTurndownService();
      if (turndownService)
          { return turndownService.turndown(html); }
      return null;
  };
  /********************************************************************************** */
  /** ADDON OPTIONS */
  var OptionName = "hmdPaste";
  CodeMirror.defineOption(OptionName, false, function (cm, newVal) {
      var enabled = !!newVal;
      if (!enabled || typeof newVal === "boolean") {
          newVal = defaultConvertor;
      }
      ///// apply config
      var inst = getAddon(cm);
      inst.ff_enable.setBool(enabled);
      inst.convertor = newVal;
  });
  /********************************************************************************** */
  /** ADDON CLASS */
  var AddonAlias = "paste";
  var Paste = function(cm) {
      var this$1 = this;

      // add your code here
      this.cm = cm;
      this.convertor = defaultConvertor;
      this.pasteHandler = function (cm, ev) {
          var cd = ev.clipboardData || window['clipboardData'];
          var convertor = this$1.convertor;
          if (!convertor || !cd || cd.types.indexOf('text/html') == -1)
              { return; }
          var result = convertor(cd.getData('text/html'));
          if (!result)
              { return; }
          cm.operation(cm.replaceSelection.bind(cm, result));
          ev.preventDefault();
      };
      this.ff_enable = new core.FlipFlop(
      /* ON  */ function () { cm.on('paste', this$1.pasteHandler); }, 
      /* OFF */ function () { cm.off('paste', this$1.pasteHandler); });
  };
  /** ADDON GETTER: Only one addon instance allowed in a editor */
  var getAddon = core.Addon.Getter(AddonAlias, Paste);

  exports.defaultConvertor = defaultConvertor;
  exports.Paste = Paste;
  exports.getAddon = getAddon;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
