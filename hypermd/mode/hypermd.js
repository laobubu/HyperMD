// CodeMirror, copyright (c) by laobubu
// Distributed under an MIT license: http://codemirror.net/LICENSE
//
// This is a patch to GFM mode. Supports:
// 1. footnote: style "hmd-footnote"
// 2. bare link: e.g. "please visit [page1] to continue", forwarding to footnote named as "page1"
//

(function (mod) {
  var CODEMIRROR_ROOT = window.CODEMIRROR_ROOT || "../../node_modules/codemirror/";
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(
      require(CODEMIRROR_ROOT + "lib/codemirror"),
      require(CODEMIRROR_ROOT + "mode/gfm/gfm"),
      require(CODEMIRROR_ROOT + "addon/mode/overlay")
    );
  else if (typeof define == "function" && define.amd) // AMD
    define([
      CODEMIRROR_ROOT + "lib/codemirror",
      CODEMIRROR_ROOT + "mode/gfm/gfm",
      CODEMIRROR_ROOT + "addon/mode/overlay"
    ], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function (CodeMirror) {
  "use strict";

  CodeMirror.defineMode("hypermd", function (config, modeConfig) {
    var codeDepth = 0;
    var hypermdOverlay = {
      startState: function () {
        return {
          atBeginning: true,  //at the beginning of one line, quotes are skipped
          insideCodeFence: false,
          inside: null, // "link"
          prevLineIsEmpty: false,
          inList: false,
          extra: null   // reserved
        };
      },
      copyState: function (s) {
        return {
          // structure of `s` is defined in startState; do a deep copy for it
          atBeginning: s.atBeginning,
          insideCodeFence: s.insideCodeFence,
          inside: s.inside,
          prevLineIsEmpty: s.prevLineIsEmpty,
          inList: s.inList,
          extra: s.extra
        };
      },
      blankLine: function (s) {
        s.prevLineIsEmpty = true
        s.inList = false
        return null
      },
      token: function (stream, state) {
        state.combineTokens = null;

        var start = stream.pos
        var retToken

        if (state.thisLine != stream) {
          state.prevLine = state.thisLine
          state.thisLine = stream
        }

        if (start === 0) {
          if (/^(?:-{3,}|={3,})$/.test(stream.string) && !state.prevLineIsEmpty) {
            var _hlevel = ((stream.string.charAt(0) == '=') ? 1 : 2)
            stream.skipToEnd()
            return 'formatting formatting-hmd-stdheader hmd-stdheader hmd-stdheader-' + _hlevel
          }
          state.prevLineIsEmpty = false
          state.atBeginning = true
        }
        if (stream.match(/^\>\s*/, true)) return null     // skip the quote indents
        if (state.atBeginning && stream.match(/^```/)) {  // toggle state for codefence
          state.insideCodeFence ^= 1
          stream.skipToEnd()
          return null
        }
        if (state.insideCodeFence) { stream.skipToEnd(); return null }
        if (state.atBeginning && stream.match(/^\s*(?:[-*+]|\d+\.)\s+/)) {
          state.inList = true
          state.atBeginning = false  //TODO not determined
          return null
        }
        if (stream.sol() && stream.eatSpace()) {          //skip spaces
          if (stream.current().replace(/\t/g, "    ").length >= 4) {
            // this is a tranditional code block
            stream.skipToEnd()
            return null
          }
        }

        if (state.atBeginning) {
          state.atBeginning = false

          var footnote = stream.match(/^\[([^\]]+)\]:\s*/)
          if (footnote) {
            if (footnote[1].charAt(0) == '^') return "hmd-footnote hmd-footnote-real"
            return "hmd-footnote"
          }
        }

        if (state.inside) {
          if (state.inside == "link" || state.inside == "footref") {
            if (stream.eatWhile(/^[^\]]/)) {
              return (state.inside == "footref") ?
                "footref url" :
                "link url"
            }
            stream.next()
            retToken = (state.inside == "footref") ?
              "formatting formatting-footref footref" :
              "formatting formatting-link link url"
            state.inside = null
            return retToken
          }
          if (state.inside == "escape") {
            stream.next()
            state.inside = null
            return "escape-char"
          }
        } else {
          // escaped chars
          if (
            stream.peek() == "\\" &&
            "\\![]()$".indexOf(stream.string.substr(start + 1, 1)) >= 0
          ) {
            stream.next()
            state.inside = "escape"
            return "formatting formatting-escape-char escape-char"
          }

          /// bare link and ref to footnote
          if (
            stream.string[start - 1] !== "]" &&
            /^\[[^\]]{2,}\](?:[^\w\[\(]|$)/.test(stream.string.substr(start))
          ) {
            stream.next()
            if (stream.string.charAt(start + 1) == "^") {
              state.inside = "footref"
              return "formatting formatting-footref footref"
            } else {
              state.inside = "link"
              return "formatting formatting-link link url"
            }
          }

          /// inline code
          if (stream.peek() == "`") {
            stream.next()
            stream.match(/^[^`]*`/)
            return null // inline code are ignored by hypermd
          }

          /// possible table
        }

        //do nothing
        stream.next()

        return null;
      }
    };

    function f_quick_link1(stream, state) {
      stream.match(/^[^\]]+/, true)
      state.f = f_quick_link_end
    }

    var gfmConfig = {
      highlightFormatting: true,
      tokenTypeOverrides: {
        list1: "list-1",
        list2: "list-2",
        list3: "list-3",
        code: "inline-code",
        gitHubSpice: false
      }
    };
    for (var attr in modeConfig) {
      gfmConfig[attr] = modeConfig[attr];
    }
    gfmConfig.name = "gfm";
    return CodeMirror.overlayMode(CodeMirror.getMode(config, gfmConfig), hypermdOverlay);

  }, "gfm");

  CodeMirror.defineMIME("text/x-hypermd", "hypermd");
});