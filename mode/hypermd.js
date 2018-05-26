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
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(require('codemirror'), require('codemirror/mode/markdown/markdown'), require('codemirror/mode/stex/stex')) :
  typeof define === 'function' && define.amd ? define(['codemirror', 'codemirror/mode/markdown/markdown', 'codemirror/mode/stex/stex'], factory) :
  (factory(global.CodeMirror));
}(this, (function (CM) { 'use strict';

  CM = CM && CM.hasOwnProperty('default') ? CM['default'] : CM;

  // CodeMirror, copyright (c) by laobubu
  var listRE = /^(?:[*\-+]|^[0-9]+([.)]))\s+/;
  var urlRE = /^((?:(?:aaas?|about|acap|adiumxtra|af[ps]|aim|apt|attachment|aw|beshare|bitcoin|bolo|callto|cap|chrome(?:-extension)?|cid|coap|com-eventbrite-attendee|content|crid|cvs|data|dav|dict|dlna-(?:playcontainer|playsingle)|dns|doi|dtn|dvb|ed2k|facetime|feed|file|finger|fish|ftp|geo|gg|git|gizmoproject|go|gopher|gtalk|h323|hcp|https?|iax|icap|icon|im|imap|info|ipn|ipp|irc[6s]?|iris(?:\.beep|\.lwz|\.xpc|\.xpcs)?|itms|jar|javascript|jms|keyparc|lastfm|ldaps?|magnet|mailto|maps|market|message|mid|mms|ms-help|msnim|msrps?|mtqp|mumble|mupdate|mvn|news|nfs|nih?|nntp|notes|oid|opaquelocktoken|palm|paparazzi|platform|pop|pres|proxy|psyc|query|res(?:ource)?|rmi|rsync|rtmp|rtsp|secondlife|service|session|sftp|sgn|shttp|sieve|sips?|skype|sm[bs]|snmp|soap\.beeps?|soldat|spotify|ssh|steam|svn|tag|teamspeak|tel(?:net)?|tftp|things|thismessage|tip|tn3270|tv|udp|unreal|urn|ut2004|vemmi|ventrilo|view-source|webcal|wss?|wtai|wyciwyg|xcon(?:-userid)?|xfire|xmlrpc\.beeps?|xmpp|xri|ymsgr|z39\.50[rs]?):(?:\/{1,3}|[a-z0-9%])|www\d{0,3}[.]|[a-z0-9.\-]+[.][a-z]{2,4}\/)(?:[^\s()<>]|\([^\s()<>]*\))+(?:\([^\s()<>]*\)|[^\s`*!()\[\]{};:'".,<>?«»“”‘’]))/i; // from CodeMirror/mode/gfm
  var url2RE = /^\.{0,2}\/[^\>\s]+/;
  var SimpleTableRE = /^\s*[^|].*?\|.*[^|]\s*$/;
  var SimpleTableLooseRE = /^\s*[^\|].*\|/; // unfinished | row
  var SimpleTableSepRE = /^(?:\s*\:?\s*\-+\s*\:?\s*\|)+\s*\:?\s*\-+\s*\:?\s*$/; // :-----:|:-----:
  var NormalTableRE = /^\s*\|\s.*?\s\|\s.*?\s\|\s*$/;
  var NormalTableLooseRE = /^\s*\|/; // | unfinished row
  var NormalTableSepRE = /^\s*\|(?:\s*\:?\s*---+\s*\:?\s*\|){2,}\s*$/; // find  |:-----:|:-----:| line
  var linkStyle = {};
  linkStyle[1 /* BARELINK */] = "hmd-barelink";
  linkStyle[2 /* FOOTREF */] = "hmd-barelink hmd-footref";
  linkStyle[4 /* FOOTNOTE */] = "hmd-footnote line-HyperMD-footnote";
  CM.defineMode("hypermd", function (cmCfg, modeCfgUser) {
      var modeCfg = {
          math: true,
          table: true,
          toc: true,
          orgModeMarkup: true,
          fencedCodeBlockHighlighting: true,
          name: "markdown",
          highlightFormatting: true,
          taskLists: true,
          strikethrough: true,
          emoji: true,
          tokenTypeOverrides: {
              hr: "line-HyperMD-hr hr",
              // HyperMD needs to know the level of header/indent. using tokenTypeOverrides is not enough
              // header: "line-HyperMD-header header",
              // quote: "line-HyperMD-quote quote",
              // Note: there are some list related process below
              list1: "list-1",
              list2: "list-2",
              list3: "list-3",
              code: "inline-code",
              gitHubSpice: false
          },
      };
      Object.assign(modeCfg, modeCfgUser);
      modeCfg["name"] = "markdown";
      var rawMode = CM.getMode(cmCfg, modeCfg);
      var newMode = Object.assign({}, rawMode);
      newMode.startState = function () {
          var ans = rawMode.startState();
          ans.hmdTable = 0 /* NONE */;
          ans.hmdOverride = null;
          ans.hmdInnerExitTag = null;
          ans.hmdInnerExitStyle = null;
          ans.hmdInnerMode = null;
          ans.hmdLinkType = 0 /* NONE */;
          ans.hmdNextMaybe = 0 /* NONE */;
          return ans;
      };
      newMode.copyState = function (s) {
          var ans = rawMode.copyState(s);
          var keys = [
              "hmdLinkType", "hmdNextMaybe",
              "hmdTable", "hmdTableID", "hmdTableCol", "hmdTableRow",
              "hmdOverride",
              "hmdInnerMode", "hmdInnerStyle", "hmdInnerExitTag", "hmdInnerExitStyle" ];
          for (var i = 0, list = keys; i < list.length; i += 1)
              {
              var key = list[i];

              ans[key] = s[key];
          }
          if (s.hmdInnerMode)
              { ans.hmdInnerState = CM.copyState(s.hmdInnerMode, s.hmdInnerState); }
          return ans;
      };
      newMode.blankLine = function (state) {
          var ans = rawMode.blankLine(state) || "";
          if (state.code === -1) {
              ans += " line-HyperMD-codeblock line-background-HyperMD-codeblock-bg";
          }
          if (state.hmdTable) {
              state.hmdTable = 0 /* NONE */;
              state.hmdTableID = null;
          }
          return ans || null;
      };
      newMode.token = function (stream, state) {
          if (state.hmdOverride)
              { return state.hmdOverride(stream, state); }
          var wasInHTML = !!state.htmlState;
          var wasInCodeFence = state.code === -1;
          var bol = stream.start === 0;
          var firstTokenOfLine = stream.column() === state.indentation;
          var wasLinkText = state.linkText;
          var inMarkdown = !(wasInCodeFence || wasInHTML);
          var inMarkdownInline = inMarkdown && !(state.code || state.indentedCode || state.linkHref);
          var ans = "";
          var tmp;
          if (inMarkdown) {
              // now implement some extra features that require higher priority than CodeMirror's markdown
              //#region Math
              if (modeCfg.math && inMarkdownInline && (tmp = stream.match(/^\${1,2}/, false))) {
                  var tag = tmp[0], mathLevel = tag.length;
                  if (mathLevel === 2 || stream.string.indexOf(tag, stream.pos + mathLevel) !== -1) {
                      // $$ may span lines, $ must be paired
                      ans += enterMode(stream, state, "stex", tag) || "";
                      ans += " formatting formatting-math formatting-math-begin math math-" + mathLevel;
                      state.hmdInnerStyle = "math";
                      state.hmdInnerExitStyle = "formatting formatting-math formatting-math-end math math-" + mathLevel;
                      return ans;
                  }
              }
              //#endregion
              //#region [OrgMode] markup
              if (bol && modeCfg.orgModeMarkup && (tmp = stream.match(/^\#\+(\w+\:?)\s*/))) {
                  // Support #+TITLE: This is the title of the document
                  if (!stream.eol()) {
                      state.hmdOverride = function (stream, state) {
                          stream.skipToEnd();
                          state.hmdOverride = null;
                          return "string hmd-orgmode-markup";
                      };
                  }
                  return "meta formatting-hmd-orgmode-markup hmd-orgmode-markup line-HyperMD-orgmode-markup";
              }
              //#endregion
              //#region [TOC] in a single line
              if (bol && modeCfg.toc && stream.match(/^\[TOC\]\s*$/i)) {
                  return "meta line-HyperMD-toc hmd-toc";
              }
              //#endregion
          }
          // now enter markdown
          ans += " " + (rawMode.token(stream, state) || "");
          var current = stream.current();
          var inHTML = !!state.htmlState;
          var inCodeFence = state.code === -1;
          inMarkdown = inMarkdown && !(inHTML || inCodeFence);
          inMarkdownInline = inMarkdownInline && inMarkdown && !(state.code || state.indentedCode || state.linkHref);
          if (inHTML != wasInHTML) {
              if (inHTML)
                  { ans += " hmd-html-begin"; }
              else
                  { ans += " hmd-html-end"; }
          }
          if (wasInCodeFence || inCodeFence) {
              if (!state.localMode || !wasInCodeFence)
                  { ans = ans.replace("inline-code", ""); }
              ans += " line-HyperMD-codeblock line-background-HyperMD-codeblock-bg";
              if (inCodeFence !== wasInCodeFence) {
                  if (!inCodeFence)
                      { ans += " line-HyperMD-codeblock-end"; }
                  else if (!wasInCodeFence)
                      { ans += " line-HyperMD-codeblock-begin"; }
              }
          }
          if (inMarkdown) {
              var tableType = state.hmdTable;
              //#region [Table] Reset
              if (bol && tableType) {
                  var rowRE = (tableType == 1 /* SIMPLE */) ? SimpleTableLooseRE : NormalTableLooseRE;
                  if (rowRE.test(stream.string)) {
                      // still in table
                      state.hmdTableCol = 0;
                      state.hmdTableRow++;
                  }
                  else {
                      // end of a table
                      state.hmdTable = tableType = 0 /* NONE */;
                      state.hmdTableID = null;
                  }
              }
              //#endregion
              //#region Header, indentedCode, quote
              if (state.header) {
                  if (!state.prevLine.header) {
                      ans += " line-HyperMD-header line-HyperMD-header-" + state.header;
                  }
                  else {
                      ans += " line-HyperMD-header-line line-HyperMD-header-line-" + state.header;
                  }
              }
              if (state.indentedCode) {
                  ans += " hmd-indented-code";
              }
              if (state.quote && stream.eol()) {
                  ans += " line-HyperMD-quote line-HyperMD-quote-" + state.quote;
              }
              //#endregion
              //#region List
              var maxNonCodeIndentation = (state.listStack[state.listStack.length - 1] || 0) + 3;
              var tokenIsIndent = bol && /^\s+$/.test(current) && (state.list !== false || stream.indentation() <= maxNonCodeIndentation);
              var tokenIsListBullet = state.list && /formatting-list/.test(ans);
              if (tokenIsListBullet || (tokenIsIndent && (state.list !== false || stream.match(listRE, false)))) {
                  var listLevel = state.listStack && state.listStack.length || 0;
                  if (tokenIsIndent) {
                      if (stream.match(listRE, false)) { // next token is 1. 2. or bullet
                          if (state.list === false)
                              { listLevel++; }
                      }
                      else {
                          while (listLevel > 0 && stream.pos < state.listStack[listLevel - 1]) {
                              listLevel--; // find the real indent level
                          }
                          if (!listLevel) { // not even a list
                              return ans.trim() || null;
                          }
                          ans += " line-HyperMD-list-line-nobullet line-HyperMD-list-line line-HyperMD-list-line-" + listLevel;
                      }
                      ans += " hmd-list-indent hmd-list-indent-" + listLevel;
                  }
                  else if (tokenIsListBullet) {
                      // no space before bullet!
                      ans += " line-HyperMD-list-line line-HyperMD-list-line-" + listLevel;
                  }
              }
              //#endregion
              //#region Link, BareLink, Footnote etc
              if (wasLinkText !== state.linkText) {
                  if (!wasLinkText) {
                      // entering a link
                      tmp = stream.match(/^([^\]]+)\](\(| ?\[|\:)?/, false) || ["](", "", "("]; // make a fake link
                      if (!tmp[2]) { // barelink
                          if (tmp[1].charAt(0) === "^") {
                              state.hmdLinkType = 2 /* FOOTREF */;
                          }
                          else {
                              state.hmdLinkType = 1 /* BARELINK */;
                          }
                      }
                      else if (tmp[2] === ":") { // footnote
                          state.hmdLinkType = 4 /* FOOTNOTE */;
                      }
                      else {
                          state.hmdLinkType = 3 /* NORMAL */;
                      }
                  }
                  else {
                      // leaving a link
                      if (state.hmdLinkType in linkStyle)
                          { ans += " " + linkStyle[state.hmdLinkType]; }
                      if (state.hmdLinkType === 4 /* FOOTNOTE */) {
                          state.hmdLinkType = 5 /* MAYBE_FOOTNOTE_URL */;
                      }
                      else {
                          state.hmdLinkType = 0 /* NONE */;
                      }
                  }
              }
              if (state.hmdLinkType !== 0 /* NONE */) {
                  if (state.hmdLinkType in linkStyle)
                      { ans += " " + linkStyle[state.hmdLinkType]; }
                  if (state.hmdLinkType === 5 /* MAYBE_FOOTNOTE_URL */) {
                      if (!/^(?:\]\:)?\s*$/.test(current)) { // not spaces
                          if (urlRE.test(current) || url2RE.test(current))
                              { ans += " hmd-footnote-url"; }
                          else
                              { ans = ans.replace("string url", ""); }
                          state.hmdLinkType = 0 /* NONE */; // since then, can't be url anymore
                      }
                  }
              }
              //#endregion
              //#region start of an escaped char
              if (/formatting-escape/.test(ans) && current.length > 1) {
                  // CodeMirror merge backslash and escaped char into one token, which is not good
                  // Use hmdOverride to separate them
                  var escapedLength = current.length - 1;
                  var escapedCharStyle = ans.replace("formatting-escape", "escape") + " hmd-escape-char";
                  state.hmdOverride = function (stream, state) {
                      stream.pos += escapedLength;
                      state.hmdOverride = null;
                      return escapedCharStyle.trim();
                  };
                  ans += " hmd-escape-backslash";
                  stream.pos -= escapedLength;
                  return ans;
              }
              //#endregion
              //#region [Table] Creating Table and style Table Separators
              if (!ans.trim() && modeCfg.table) {
                  // string is unformatted
                  var isTableSep = false;
                  if (current.charAt(0) === "|") {
                      // is "|xxxxxx", separate "|" and "xxxxxx"
                      stream.pos = stream.start + 1; // rewind to end of "|"
                      isTableSep = true;
                  }
                  else if (tmp = current.match(/\|/)) {
                      // break unformatted "text|char" into "text" and "|char"
                      stream.pos = stream.start + tmp.index; // rewind
                  }
                  if (isTableSep) {
                      // if not inside a table, try to construct one
                      if (!tableType) {
                          if (SimpleTableRE.test(stream.string) && SimpleTableSepRE.test(stream.lookAhead(1)))
                              { tableType = 1 /* SIMPLE */; }
                          else if (NormalTableRE.test(stream.string) && NormalTableSepRE.test(stream.lookAhead(1)))
                              { tableType = 2 /* NORMAL */; }
                          if (state.hmdTable = tableType) {
                              // successfully made one
                              state.hmdTableID = "T" + stream.lineOracle.line;
                              state.hmdTableRow = state.hmdTableCol = 0;
                          }
                      }
                      // then
                      if (tableType) {
                          var row = state.hmdTableRow;
                          var col = state.hmdTableCol++;
                          if (col == 0)
                              { ans += " line-HyperMD-table_" + (state.hmdTableID) + " line-HyperMD-table-" + tableType + " line-HyperMD-table-row line-HyperMD-table-row-" + row; }
                          ans += " hmd-table-sep hmd-table-sep-" + col;
                          if (tableType === 2 /* NORMAL */ && (col == 0 || stream.match(/^\s*$/, false))) {
                              // Normal style table has extra `|` at the start / end of lines
                              ans += " hmd-table-sep-dummy";
                          }
                      }
                  }
              }
              //#endregion
              if (tableType && state.hmdTableRow === 1) {
                  // fix a stupid problem:    :------: is not emoji
                  if (/emoji/.test(ans))
                      { ans = ""; }
              }
          }
          return ans.trim() || null;
      };
      function modeOverride(stream, state) {
          var spos = stream.pos;
          var willExit = stream.match(state.hmdInnerExitTag, false);
          var extraStyle = state.hmdInnerStyle;
          var ans = state.hmdInnerMode.token(stream, state.hmdInnerState);
          if (extraStyle) {
              if (ans)
                  { ans += " " + extraStyle; }
              else
                  { ans = extraStyle; }
          }
          if (willExit) {
              var exitStyle = state.hmdInnerExitStyle;
              if (exitStyle) {
                  if (ans)
                      { ans += " " + exitStyle; }
                  else
                      { ans = exitStyle; }
              }
              stream.pos = spos + state.hmdInnerExitTag.length;
              state.hmdInnerExitStyle = null;
              state.hmdInnerExitTag = null;
              state.hmdInnerMode = null;
              state.hmdInnerState = null;
              state.hmdOverride = null;
          }
          return ans;
      }
      /** switch to another mode */
      function enterMode(stream, state, modeName, endTag) {
          var mode = CM.getMode(cmCfg, modeName);
          if (!mode || mode["name"] === "null") {
              // mode not loaded, create a dummy mode
              stream.pos += endTag.length; // skip beginning chars
              var charSkipper = RegExp(("^(?:\\.|[\\" + (endTag.charAt(0)) + "]+)+"));
              mode = {
                  token: function(stream, state) {
                      stream.match(charSkipper) || stream.next();
                      return null;
                  }
              };
          }
          state.hmdInnerExitTag = endTag;
          state.hmdInnerMode = mode;
          state.hmdOverride = modeOverride;
          return mode.token(stream, state.hmdInnerState = CM.startState(mode));
      }
      return newMode;
  }, "hypermd");
  CM.defineMIME("text/x-hypermd", "hypermd");

})));
