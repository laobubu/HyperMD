(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('codemirror'), require('../core'), require('./read-link')) :
  typeof define === 'function' && define.amd ? define(['exports', 'codemirror', '../core', './read-link'], factory) :
  (factory((global.HyperMD = global.HyperMD || {}, global.HyperMD.Click = {}),global.CodeMirror,null));
}(this, (function (exports,CodeMirror,core) { 'use strict';

  CodeMirror = CodeMirror && CodeMirror.hasOwnProperty('default') ? CodeMirror['default'] : CodeMirror;

  // HyperMD, copyright (c) by laobubu
  var defaultClickHandler = function (info, cm) {
      var text = info.text;
      var type = info.type;
      var url = info.url;
      var pos = info.pos;
      if (type === 'url' || type === 'link') {
          var footnoteRef = text.match(/\[[^\[\]]+\]$/); // bare link test. assume no escaping char inside
          if (footnoteRef && info.altKey) {
              // extract footnote part (with square brackets), then jump to the footnote
              text = footnoteRef[0];
              type = "footref";
          }
          else if ((info.ctrlKey || info.altKey) && url) {
              // just open URL
              window.open(url, "_blank");
          }
      }
      if (type === 'todo') {
          var ref = core.expandRange(cm, pos, "formatting-task");
          var from = ref.from;
          var to = ref.to;
          var text$1 = cm.getRange(from, to);
          text$1 = (text$1 === '[ ]') ? '[x]' : '[ ]';
          cm.replaceRange(text$1, from, to);
      }
      if (type === 'footref') {
          // Jump to FootNote
          var footnote_name = text.substr(1, text.length - 2);
          var footnote = cm.hmdReadLink(footnote_name, pos.line);
          if (footnote) {
              makeBackButton(cm, footnote.line, pos);
              cm.setCursor({ line: footnote.line, ch: 0 });
          }
      }
  };
  /**
   * Display a "go back" button. Requires "HyperMD-goback" gutter set.
   *
   * maybe not useful?
   *
   * @param line where to place the button
   * @param anchor when user click the back button, jumps to here
   */
  var makeBackButton = (function () {
      var bookmark = null;
      function updateBookmark(cm, pos) {
          if (bookmark) {
              cm.clearGutter("HyperMD-goback");
              bookmark.clear();
          }
          bookmark = cm.setBookmark(pos);
      }
      /**
       * Make a button, bind event handlers, but not insert the button
       */
      function makeButton(cm) {
          var hasBackButton = cm.options.gutters.indexOf("HyperMD-goback") != -1;
          if (!hasBackButton)
              { return null; }
          var backButton = document.createElement("div");
          backButton.className = "HyperMD-goback-button";
          backButton.addEventListener("click", function () {
              cm.setCursor(bookmark.find());
              cm.clearGutter("HyperMD-goback");
              bookmark.clear();
              bookmark = null;
          });
          var _tmp1 = cm.display.gutters.children;
          _tmp1 = _tmp1[_tmp1.length - 1];
          _tmp1 = _tmp1.offsetLeft + _tmp1.offsetWidth;
          backButton.style.width = _tmp1 + "px";
          backButton.style.marginLeft = -_tmp1 + "px";
          return backButton;
      }
      return function (cm, line, anchor) {
          var backButton = makeButton(cm);
          if (!backButton)
              { return; }
          backButton.innerHTML = (anchor.line + 1) + "";
          updateBookmark(cm, anchor);
          cm.setGutterMarker(line, "HyperMD-goback", backButton);
      };
  })();
  var defaultOption = {
      enabled: false,
      handler: null,
  };
  var OptionName = "hmdClick";
  CodeMirror.defineOption(OptionName, false, function (cm, newVal) {
      var enabled = !!newVal;
      if (!enabled || typeof newVal === "boolean") {
          newVal = { enabled: enabled };
      }
      else if (typeof newVal === "function") {
          newVal = { enabled: true, handler: newVal };
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
  var AddonAlias = "click";
  var Click = function(cm) {
      var this$1 = this;

      this.cm = cm;
      /**
       * Unbind _mouseUp, then call ClickHandler if mouse not bounce
       */
      this._mouseUp = function (ev) {
          var cinfo = this$1._cinfo;
          this$1.lineDiv.removeEventListener("mouseup", this$1._mouseUp, false);
          if (Math.abs(ev.clientX - cinfo.clientX) > 5 || Math.abs(ev.clientY - cinfo.clientY) > 5)
              { return; }
          if (typeof this$1.handler === 'function' && this$1.handler(cinfo, this$1.cm) === false)
              { return; }
          defaultClickHandler(cinfo, this$1.cm);
      };
      /**
       * Try to construct ClickInfo and bind _mouseUp
       */
      this._mouseDown = function (ev) {
          var button = ev.button;
          var clientX = ev.clientX;
          var clientY = ev.clientY;
          var ctrlKey = ev.ctrlKey;
          var altKey = ev.altKey;
          var shiftKey = ev.shiftKey;
          var cm = this$1.cm;
          if (ev.target.tagName === "PRE")
              { return; }
          var pos = cm.coordsChar({ left: clientX, top: clientY });
          var range;
          var styles = " " + cm.getTokenTypeAt(pos) + " ";
          var mat;
          var type = null;
          var text, url;
          if (mat = styles.match(/\s(image|link|url)\s/)) {
              // Could be a image, link, bare-link, footref, footnote, plain url, plain url w/o angle brackets
              type = mat[1];
              range = core.expandRange(cm, pos, type);
              var isBareLink = /\shmd-barelink\s/.test(styles);
              if (/^(?:image|link)$/.test(type) && !isBareLink) {
                  // CodeMirror breaks [text] and (url)
                  // Let HyperMD mode handle it!
                  var tmp_range = core.expandRange(cm, { line: pos.line, ch: range.to.ch + 1 }, "url");
                  range.to = tmp_range.to;
              }
              text = cm.getRange(range.from, range.to);
              // now extract the URL. boring job
              var t = text.replace(/^\!?\[/, '');
              if ((mat = t.match(/[^\\]\]\((.+)\)$/)) // .](url) image / link without ref
              ) {
                  url = mat[1];
                  // remove title part (if exists)
                  mat = url.match(/^"([^"]+)"|^\S+/);
                  url = mat[1] || mat[0];
              }
              else if ((mat = t.match(/[^\\]\]\[(.+)\]$/)) || // .][ref] image / link with ref
                  (mat = text.match(/^\[(.+)\](?:\:\s*)?$/)) // [barelink] or [^ref] or [footnote]:
              ) {
                  if (isBareLink && mat[1].charAt(0) === '^')
                      { type = 'footref'; }
                  var t2 = cm.hmdReadLink(mat[1], pos.line);
                  if (!t2)
                      { url = null; }
                  else {
                      // remove title part (if exists)
                      mat = t2.content.match(/^"([^"]+)"|^\S+/);
                      url = mat[1] || mat[0];
                  }
              }
              else if ((mat = text.match(/^\<(.+)\>$/)) || // <http://laobubu.net>
                  (mat = text.match(/^\((.+)\)$/)) || // (http://laobubu.net)
                  (mat = [null, text]) // http://laobubu.netlast possibility: plain url w/o < >
              ) {
                  url = mat[1];
              }
          }
          else if (styles.match(/\sformatting-task\s/)) {
              // TO-DO checkbox
              type = "todo";
              range = core.expandRange(cm, pos, "formatting-task");
              range.to.ch = cm.getLine(pos.line).length;
              text = cm.getRange(range.from, range.to);
              url = null;
          }
          if (type !== null) {
              this$1._cinfo = {
                  type: type, text: text, url: url, pos: pos,
                  button: button, clientX: clientX, clientY: clientY,
                  ctrlKey: ctrlKey, altKey: altKey, shiftKey: shiftKey,
              };
              this$1.lineDiv.addEventListener('mouseup', this$1._mouseUp, false);
          }
      };
      this.lineDiv = cm.display.lineDiv;
      this.ff_enable = new core.FlipFlop(
      /* ON  */ function () { this$1.lineDiv.addEventListener("mousedown", this$1._mouseDown, false); }, 
      /* OFF */ function () { this$1.lineDiv.removeEventListener("mousedown", this$1._mouseDown, false); });
  };
  /** ADDON GETTER: Only one addon instance allowed in a editor */
  var getAddon = core.Addon.Getter(AddonAlias, Click, defaultOption);

  exports.defaultClickHandler = defaultClickHandler;
  exports.defaultOption = defaultOption;
  exports.Click = Click;
  exports.getAddon = getAddon;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
