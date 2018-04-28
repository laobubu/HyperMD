// CodeMirror, copyright (c) by laobubu
// Distributed under an MIT license: http://codemirror.net/LICENSE
//
// This is a patch to GFM mode. Supports:
// 1. footnote: style "hmd-footnote"
// 2. bare link: e.g. "please visit [page1] to continue", forwarding to footnote named as "page1"
//

(function (mod) {
  var CODEMIRROR_ROOT = window.CODEMIRROR_ROOT || "codemirror/";
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

  var listRE = /^\s*(?:[*\-+]|[0-9]+([.)]))\s+/  // this regex is from CodeMirror's sourcecode

  CodeMirror.defineMode("hypermd", function (config, modeConfig) {
    var codeDepth = 0;
    var hypermdOverlay = {
      startState: function () {
        return {
          atBeginning: true,  //at the beginning of one line, quotes are skipped
          insideCodeFence: false,
          quoteLevel: 0,
          inside: null, // math, listSpace
          listSpaceStack: [], // spaces for every levels like [1, 2, 2] ...
          // NOTICE: listSpaceStack[0] could be 0, (eg. ordered list, or " - "'s leading space is missing)
          //         if meet the situation, do not return any token, otherwise CodeMirror would crash
          prevLineIsEmpty: false,
          extra: null   // reserved, works with "inside"
          // when inside "math", this is the token like `$` or `$$`
          // when insnde "listSpace", this is the index of listSpaceStack(array)
        };
      },
      copyState: function (s) {
        return {
          // structure of `s` is defined in startState; do a deep copy for it
          atBeginning: s.atBeginning,
          insideCodeFence: s.insideCodeFence,
          quoteLevel: s.quoteLevel,
          inside: s.inside,
          listSpaceStack: s.listSpaceStack && s.listSpaceStack.slice(),
          prevLineIsEmpty: s.prevLineIsEmpty,
          extra: s.extra
        };
      },
      blankLine: function (s) {
        s.atBeginning = true
        s.prevLineIsEmpty = true
        s.quoteLevel = 0
        s.listSpaceStack = []

        if (s.insideCodeFence) return "line-HyperMD-codeblock"
        return null
      },
      token: function (stream, state) {
        state.combineTokens = null;

        var start = stream.pos
        var retToken, tmp, tmp2, tmp3

        if (state.thisLine != stream) {
          state.prevLine = state.thisLine
          state.thisLine = stream
        }

        if (state.inside == "math" && state.extra.length == 2) {
          tmp = stream.string.indexOf(state.extra, start)
          if (tmp == start) {
            stream.pos += 2
            state.inside = null
            return "formatting formatting-math formatting-math-end math math-" + state.extra.length
          }
          if (tmp > 0) stream.pos = tmp
          else stream.skipToEnd()
          return "math math-" + state.extra.length
        }

        //////////////////////////////////////////////////////////////////
        /// start process one raw line
        if (start === 0) {
          // Now we are at the beginning of current line
          state.atBeginning = true

          /**
           * StdHeader
           * -----------
           * ^we are here
           * 
           * Note: since we can't go back and modify header title text's style
           *       the only remedy is writing some CSS rules, targeting .hmd-stdheader-line
           */
          if (/^(?:-{3,}|={3,})$/.test(stream.string) && !state.prevLineIsEmpty) {
            var _hlevel = ((stream.string.charAt(0) == '=') ? 1 : 2)
            stream.skipToEnd()
            return 'formatting line-HyperMD-header-line line-HyperMD-header-line-' + _hlevel
          }

          // since now prevLineIsEmpty is useless
          // this is not blankLine function, so this line is not empty. mark it for the next line
          state.prevLineIsEmpty = false

          var indentation = stream.indentation()

          /**
           * Last line has unfinished Tex Math like $ x = \pi + 123...
           * 
           * Just clear the status
           */
          if ('math' == state.inside && state.extra.length != 2) state.inside = null

          /**
           * > > blockquote! we are at the beginning !
           * ^we are here
           * 
           * When a style is prefixed by "line-" , CodeMirror will call addLineClass
           */
          if (stream.match(/^\>\s*/)) {
            var quoteLevel = 1
            while (stream.match(/^\s*\>\s*/)) quoteLevel++
            state.quoteLevel = quoteLevel

            return (
              "formatting formatting-quote formatting-quote-" + quoteLevel +
              " quote quote-" + quoteLevel +
              " line-HyperMD-quote line-HyperMD-quote-" + quoteLevel
            )
          } else if (state.quoteLevel) {
            /**
             * > block support such
             *   syntax
             * ^ we are here.
             * 
             */
            stream.next()
            state.combineTokens = true
            return "line-HyperMD-quote line-HyperMD-quote-" + state.quoteLevel
          }

          /**
           * ## Header
           * ^we are here
           * 
           */
          if (stream.match(/^(#+)(?: |$)/, false)) {
            state.combineTokens = true
            return "line-HyperMD-header line-HyperMD-header-" + stream.match(/^#+/)[0].length
          }

          /**
           * ```c++
           * ^we are here (if !insideCodeFence)
           * 
           * ```
           * ^or here (if insideCodeFence)
           */
          if (stream.match(/^```/)) {  // toggle state for codefence
            state.combineTokens = true
            state.insideCodeFence ^= 1
            var fence_type = state.insideCodeFence ? 'start' : 'end'
            return "line-HyperMD-codeblock line-HyperMD-codeblock-" + fence_type
          }

          /**
           * if insideCodeFence, nothing to process.
           */
          if (state.insideCodeFence) {
            stream.skipToEnd()
            state.combineTokens = true
            return "line-HyperMD-codeblock"
          }

          //FIXME: tranditional code block is buggy and shall be deprecated!
          /**
           * this is a tranditional code block
           * 
           *     #include <stdio.h>
           * ^we are here and we can see lots of space
           * 
           * note that we can't detect the program's language, so, no need to set `state.combineTokens = true`
           */
          if (state.listSpaceStack.length === 0 && indentation >= 4) {
            stream.skipToEnd()
            return "line-HyperMD-codeblock line-background-HyperMD-codeblock-indented"
          }

          /**
           * this is a list
           * 
           * Note: list checking must be the last step of `if (start === 0) { ... }` ; it doesn't jump out this function
           */
          if (state.listSpaceStack.length !== 0 || stream.match(listRE, false)) {
            // rebuild state.listSpaceStack
            var zero_leading = state.listSpaceStack[0] === 0

            for (var i = zero_leading ? 1 : 0; i < state.listSpaceStack.length; i++) {
              if (indentation > 0) indentation -= state.listSpaceStack[i]
              else {
                state.listSpaceStack.splice(i)
                break
              }
            }
            if (indentation > 0) {
              // new nested level
              state.listSpaceStack.push(indentation)
            }

            // for situations like ordered list whose beginning char is not a space
            if (state.listSpaceStack.length === 0) {
              state.listSpaceStack.push(0)
            }

            // finished listSpaceStack, now we shall get into it and treat every indent(spaces) as a token
            state.inside = "listSpace"
            state.extra = 0
          }
        }

        // following `if (state.listSpaceStack.length !== 0 || stream.match(listRE, false))` 's status
        if (state.inside == "listSpace") {
          var listLevel = state.listSpaceStack.length
          var firstMet = state.extra === 0

          if (firstMet && state.listSpaceStack[0] === 0) {
            // skip this virtual token. see listSpaceStack's comment above
            state.extra++
          }

          if (state.extra >= listLevel) {
            // edge case: "1. xxxxx" where virtual token (indent length=0) skipped just now
            state.inside = null
            state.extra = null
          } else {
            stream.pos += state.listSpaceStack[state.extra]

            var ans = ""
            ans = "hmd-list-indent hmd-list-indent-" + (state.extra + 1)
            if (firstMet) ans += " line-HyperMD-line line-HyperMD-line-" + listLevel

            if (++state.extra >= listLevel) {
              // this is the last indenting space, going to exit "listSpace" status
              state.inside = null
              state.extra = null
            }

            state.combineTokens = true
            return ans
          }
        }

        //////////////////////////////////////////////////////////////////
        /// now list bullets and quote indents are gone. Enter the content.
        
        // first, deal with some special stuff that only appears once at Beginning
        if (state.atBeginning) {

          /**
           * Markdown supports footref [^f1]
           * 
           * [^f1]: you may reference this footnote
           * ^we are here
           * 
           * note: ^ is not necessary.
           */
          if (stream.match(/^\[[^\]]+\]\:/)) {
            state.combineTokens = true
            return "line-HyperMD-footnote hmd-footnote"
          }

          state.atBeginning = false
        }

        // then just normal inline stuffs
        state.combineTokens = true

        if (state.inside) {
          if (state.inside == "math") {
            state.combineTokens = false // math stuff can't be messed up with Markdown

            if (stream.match(state.extra)) {
              state.inside = null
              return "formatting formatting-math formatting-math-end math math-" + state.extra.length
            }
            tmp = start
            while (tmp != -1) {
              tmp = stream.string.indexOf(state.extra, tmp + 1)
              if (tmp == -1) break
              if (stream.string.charAt(tmp - 1) != "\\") {
                stream.pos = tmp
                return "math math-" + state.extra.length
              }
            }
            stream.skipToEnd()
            return "math math-" + state.extra.length
          }
        } else {
          /// escaped chars
          // now CodeMirror(>=5.37) built-in markdown mode will handle this.

          /// footref and bare link
          tmp = stream.match(/^\[([^\]]+)\]/)
          if (tmp && !/[\[\(]/.test(stream.peek())) {
            var ans = "hmd-barelink"
            if (tmp[1].charAt(0) === "^") ans += " hmd-footref"

            state.combineTokens = true
            return ans
          }

          /// inline code
          if (stream.peek() == "`") {
            stream.next()
            stream.match(/^[^`]*`/)
            return null // inline code are ignored by hypermd
          }

          /// inline math
          tmp = stream.match(/^\${1,2}/)
          if (tmp && (tmp[0] == '$$' || stream.string.indexOf(tmp[0], start + 2) != -1)) {
            state.inside = "math"
            state.extra = tmp[0]
            return "formatting formatting-math formatting-math-begin math math-" + state.extra.length // inline code are ignored by hypermd
          }

          /// possible table
        }

        //do nothing
        stream.next()

        return null;
      }
    };

    var gfmConfig = {
      highlightFormatting: true,
      tokenTypeOverrides: {
        hr: "line-HyperMD-hr hr",
        // HyperMD needs to know the level of header/indent. using tokenTypeOverrides is not enough
        // header: "line-HyperMD-header header", 
        // quote: "line-HyperMD-quote quote",
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

    var finalMode = CodeMirror.overlayMode(CodeMirror.getMode(config, gfmConfig), hypermdOverlay);

    // // now deal with indent method
    // var baseIndent = finalMode.indent;
    // finalMode.indent = function (state, textAfter) {
    //   console.log("INDENT", arguments)
    //   return baseIndent ? baseIndent(state, textAfter) : CodeMirror.Pass
    // }

    return finalMode
  }, "gfm");

  CodeMirror.defineMIME("text/x-hypermd", "hypermd");
});