(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('codemirror'), require('../core'), require('./read-link')) :
  typeof define === 'function' && define.amd ? define(['exports', 'codemirror', '../core', './read-link'], factory) :
  (factory((global.HyperMD = global.HyperMD || {}, global.HyperMD.Fold = {}),global.CodeMirror,global.HyperMD,global.HyperMD.ReadLink));
}(this, (function (exports,CodeMirror,core,readLink) { 'use strict';

  CodeMirror = CodeMirror && CodeMirror.hasOwnProperty('default') ? CodeMirror['default'] : CodeMirror;

  // HyperMD, copyright (c) by laobubu
  var DEBUG = false;
  var builtinFolder = {
      image: function(stream, token) {
          var cm = stream.cm;
          var imgRE = /\bimage-marker\b/;
          var urlRE = /\bformatting-link-string\b/; // matches the parentheses
          if (imgRE.test(token.type)) {
              var lineNo = stream.lineNo;
              // find the begin and end of url part
              var url_begin = stream.findNext(urlRE);
              var url_end = stream.findNext(urlRE, url_begin.i_token + 1);
              var from = { line: lineNo, ch: token.start };
              var to = { line: lineNo, ch: url_end.token.end };
              var rngReq = stream.requestRange(from, to);
              if (rngReq === exports.RequestRangeResult.OK) {
                  var img = document.createElement("img");
                  img.height = 100;
                  img.width = 100;
                  img.src = "https://codemirror.net/doc/logo.png";
                  var marker = cm.markText(from, to, {
                      collapsed: true,
                      replacedWith: img,
                  });
                  img.addEventListener('click', function () {
                      var pos = marker.find();
                      marker.clear();
                      cm.setCursor(pos.from);
                      cm.focus();
                  }, false);
                  return marker;
              }
              else {
                  if (DEBUG) {
                      console.log("[image]FAILED TO REQUEST RANGE: ", rngReq);
                  }
              }
          }
          return null;
      },
      link: function(stream, token) {
          var cm = stream.cm;
          var urlRE = /\bformatting-link-string\b/; // matches the parentheses
          var endTest = function (token) { return (urlRE.test(token.type) && token.string === ")"); };
          if (token.string === "(" && urlRE.test(token.type) && // is URL left parentheses
              (stream.i_token === 0 || !/\bimage/.test(stream.lineTokens[stream.i_token - 1].type)) // not a image URL
          ) {
              var lineNo = stream.lineNo;
              var url_end = stream.findNext(endTest);
              var from = { line: lineNo, ch: token.start };
              var to = { line: lineNo, ch: url_end.token.end };
              var rngReq = stream.requestRange(from, to);
              if (rngReq === exports.RequestRangeResult.OK) {
                  var text = cm.getRange(from, to);
                  var ref = readLink.splitLink(text.substr(1, text.length - 2));
                  var url = ref.url;
                  var title = ref.title;
                  var img = document.createElement("span");
                  img.setAttribute("class", "hmd-link-icon");
                  img.setAttribute("title", url + "\n" + title);
                  img.setAttribute("data-url", url);
                  var marker = cm.markText(from, to, {
                      collapsed: true,
                      replacedWith: img,
                  });
                  img.addEventListener('click', function () {
                      var pos = marker.find();
                      marker.clear();
                      cm.setCursor(pos.from);
                      cm.focus();
                  }, false);
                  return marker;
              }
              else {
                  if (DEBUG) {
                      console.log("[link]FAILED TO REQUEST RANGE: ", rngReq);
                  }
              }
          }
          return null;
      },
  };
  var defaultOption = {
      image: false,
      link: false,
      customFolders: {},
  };
  var OptionName = "hmdFold";
  CodeMirror.defineOption(OptionName, false, function (cm, newVal) {
      var enabled = !!newVal;
      if (!enabled || typeof newVal === "boolean") {
          // enable/disable all builtinFolder
          newVal = {};
          for (var type in builtinFolder)
              { newVal[type] = enabled; }
      }
      var newCfg = core.Addon.migrateOption(newVal, defaultOption);
      ///// apply config
      var inst = getAddon(cm);
      for (var type$1 in builtinFolder)
          { inst.setBuiltinStatus(type$1, newVal[type$1]); }
      if (typeof newVal.customFolders !== "object")
          { newVal.customFolders = {}; }
      var customFolderTypes = [];
      for (var key in newVal.customFolders) {
          if (newVal.customFolders.hasOwnProperty(key)) {
              customFolderTypes.push(key);
              if (!(key in inst.folded))
                  { inst.folded[key] = []; }
          }
      }
      //TODO: shall we clear disappeared folder's legacy?
      inst.customFolderTypes = customFolderTypes;
      ///// start a fold
      inst.startFold();
  });
  (function (RequestRangeResult) {
      // Use string values because in TypeScript, string enum members do not get a reverse mapping generated at all.
      // Otherwise the generated code looks ugly
      RequestRangeResult["OK"] = "ok";
      RequestRangeResult["CURSOR_INSIDE"] = "ci";
      RequestRangeResult["HAS_MARKERS"] = "hm";
  })(exports.RequestRangeResult || (exports.RequestRangeResult = {}));
  /********************************************************************************** */
  /** ADDON CLASS */
  var AddonAlias = "fold";
  var Fold = function(cm) {
      var this$1 = this;

      this.cm = cm;
      // stores builtin Folder status with FlipFlops
      this.ff_builtin = {};
      /** Folder's output goes here */
      this.folded = {};
      /// END OF APIS THAT EXPOSED TO FolderFunc
      ///////////////////////////////////////////////////////////////////////////////////////////
      /**
       * Fold everything! (This is a debounced, and `this`-binded version)
       */
      this.startFold = core.debounce(this.startFoldImmediately.bind(this), 100);
      /** stores every affected lineNo */
      this._quickFoldHint = [];
      cm.on("changes", function (cm, changes) {
          var fromLine = changes.reduce(function (prev, curr) { return Math.min(prev, curr.from.line); }, cm.lastLine());
          this$1.startFold();
      });
      cm.on("cursorActivity", function (cm) {
          this$1.startQuickFold();
      });
  };
  /** Update a builtin folder's status, and fold/unfold */
  Fold.prototype.setBuiltinStatus = function (type, status) {
      if (!(type in builtinFolder))
          { return; }
      var ff = this.ff_builtin[type];
      if (!ff) { //whoops, the FlipFlop not created
          ff = new core.FlipFlop(this.startFold, this.clear.bind(this, type));
          this.ff_builtin[type] = ff;
      }
      ff.setBool(status);
  };
  Fold.prototype.findNext = function (condition, varg) {
      var lineNo = this.lineNo;
      var tokens = this.lineTokens;
      var token = null;
      var i_token = typeof varg === 'number' ? varg : (this.i_token + 1);
      for (; i_token < tokens.length; i_token++) {
          var token_tmp = tokens[i_token];
          if ((typeof condition === "function") ? condition(token_tmp) : condition.test(token_tmp.type)) {
              token = token_tmp;
              break;
          }
      }
      if (!token && varg === true) {
          var cm = this.cm;
          cm.eachLine(+1, cm.lastLine(), function (line_i) {
              lineNo = line_i.lineNo();
              tokens = cm.getLineTokens(lineNo);
              for (i_token = 0; i_token < tokens.length; i_token++) {
                  var token_tmp = tokens[i_token];
                  if ((typeof condition === "function") ? condition(token_tmp) : condition.test(token_tmp.type)) {
                      token = token_tmp;
                      return true; // stop `eachLine`
                  }
              }
          });
      }
      return token ? { lineNo: lineNo, token: token, i_token: i_token } : null;
  };
  /** Update `Fold` stream's current position */
  Fold.prototype.setPos = function (line, ch, precise) {
      if (ch === void 0) {
          ch = line;
          line = this.line;
      }
      else if (typeof line === 'number')
          { line = this.cm.getLineHandle(line); }
      var sameLine = line === this.line;
      var i_token = 0;
      if (precise || !sameLine) {
          this.line = line;
          this.lineNo = line.lineNo();
          this.lineTokens = this.cm.getLineTokens(this.lineNo);
      }
      else {
          // try to speed-up seeking
          i_token = this.i_token;
          var token = this.lineTokens[i_token];
          if (token.start > ch)
              { i_token = 0; }
      }
      var tokens = this.lineTokens;
      for (; i_token < tokens.length; i_token++) {
          if (tokens[i_token].end > ch)
              { break; } // found
      }
      this.i_token = i_token;
  };
  /**
   * Check if a range is foldable and update _quickFoldHint
   *
   * NOTE: this function is always called after `_quickFoldHint` reset by `startFoldImmediately`
   */
  Fold.prototype.requestRange = function (from, to) {
      var cm = this.cm, cmpPos = CodeMirror.cmpPos;
      var cursorPos = cm.getCursor();
      var markers = cm.findMarks(from, to);
      var ans = exports.RequestRangeResult.OK;
      if (markers.length !== 0)
          { ans = exports.RequestRangeResult.HAS_MARKERS; }
      else if (cmpPos(cursorPos, from) >= 0 && cmpPos(cursorPos, to) <= 0)
          { ans = exports.RequestRangeResult.CURSOR_INSIDE; }
      if (ans !== exports.RequestRangeResult.OK)
          { this._quickFoldHint.push(from.line); }
      return ans;
  };
  /**
   * Fold everything!
   *
   * @param toLine last line to fold. Inclusive
   */
  Fold.prototype.startFoldImmediately = function (fromLine, toLine) {
          var this$1 = this;

      var cm = this.cm;
      fromLine = fromLine || cm.firstLine();
      toLine = (toLine || cm.lastLine()) + 1;
      this._quickFoldHint = [];
      this.setPos(fromLine, 0, true);
      cm.eachLine(fromLine, toLine, function (line) {
          var lineNo = line.lineNo();
          if (lineNo < this$1.lineNo)
              { return; } // skip current line...
          else if (lineNo > this$1.lineNo)
              { this$1.setPos(lineNo, 0); } // hmmm... maybe last one is empty line
          var charMarked = new Array(line.text.length);
          {
              // populate charMarked array.
              // @see CodeMirror's findMarksAt
              var lineMarkers = line.markedSpans;
              if (lineMarkers) {
                  for (var i = 0; i < lineMarkers.length; ++i) {
                      var span = lineMarkers[i];
                      var spanFrom = span.from == null ? 0 : span.from;
                      var spanTo = span.to == null ? charMarked.length : span.to;
                      for (var j = spanFrom; j < spanTo; j++)
                          { charMarked[j] = true; }
                  }
              }
          }
          var tokens = this$1.lineTokens;
          while (this$1.i_token < tokens.length) {
              var token = tokens[this$1.i_token];
              var type;
              var marker = null;
              var tokenFoldable = true;
              {
                  for (var i$1 = token.start; i$1 < token.end; i$1++) {
                      if (charMarked[i$1]) {
                          tokenFoldable = false;
                          break;
                      }
                  }
              }
              if (tokenFoldable) {
                  // try built-in folders
                  for (type in this$1.ff_builtin) {
                      if (this$1.ff_builtin[type].state && (marker = builtinFolder[type](this$1, token)))
                          { break; }
                  }
                  if (!marker) {
                      // try custom folders
                      for (var i$2 = 0, list = this$1.customFolderTypes; i$2 < list.length; i$2 += 1) {
                          type = list[i$2];

                              if (marker = this$1.customFolders[type](this$1, token))
                              { break; }
                      }
                  }
              }
              if (!marker) {
                  // this token not folded. check next
                  this$1.i_token++;
              }
              else {
                  var ref = marker.find();
                      var from = ref.from;
                      var to = ref.to;
                  (this$1.folded[type] || (this$1.folded[type] = [])).push(marker);
                  marker.on('clear', function (cm, from, to) {
                      var markers = this$1.folded[type];
                      var idx;
                      if (markers && (idx = markers.indexOf(marker)) !== -1)
                          { markers.splice(idx, 1); }
                      this$1._quickFoldHint.push(from.line);
                  });
                  if (DEBUG) {
                      console.log("[FOLD] New marker ", type, from, to, marker);
                  }
                  if (to.line !== lineNo) {
                      this$1.setPos(to.line, to.ch);
                      return; // nothing left in this line
                  }
                  else {
                      this$1.setPos(to.ch); // i_token will be updated by this.setPos()
                  }
              }
          }
      });
  };
  /**
   * Start a quick fold: only process recent `requestRange`-failed ranges
   */
  Fold.prototype.startQuickFold = function () {
      var hint = this._quickFoldHint;
      if (hint.length === 0)
          { return; }
      var from = hint[0], to = from;
      for (var i = 0, list = hint; i < list.length; i += 1) {
          var lineNo = list[i];

              if (from > lineNo)
              { from = lineNo; }
          if (to < lineNo)
              { to = lineNo; }
      }
      this.startFold.stop();
      this.startFoldImmediately(from, to);
  };
  /**
   * Clear one type of folded TextMarkers
   *
   * @param type builtin folder type ("image", "link" etc) or custom fold type
   */
  Fold.prototype.clear = function (type) {
      var folded = this.folded[type];
      if (!folded || !folded.length)
          { return; }
      for (var i = 0, list = folded; i < list.length; i += 1) {
          var marker = list[i];

              marker.clear();
      }
      folded.splice(0);
  };
  /**
   * Clear all folding result
   */
  Fold.prototype.clearAll = function () {
          var this$1 = this;

      for (var type in this$1.folded) {
          var folded = this$1.folded[type];
          for (var i = 0, list = folded; i < list.length; i += 1) {
              var marker = list[i];

                  marker.clear();
          }
          folded.splice(0);
      }
  };
  /** ADDON GETTER: Only one addon instance allowed in a editor */
  var getAddon = core.Addon.Getter(AddonAlias, Fold, defaultOption /** if has options */);

  exports.builtinFolder = builtinFolder;
  exports.defaultOption = defaultOption;
  exports.Fold = Fold;
  exports.getAddon = getAddon;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
