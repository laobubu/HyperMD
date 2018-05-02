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

  /** @constant */ var listRE = /^\s*(?:[*\-+]|[0-9]+([.)]))\s+/  // this regex is from CodeMirror's sourcecode
  /** @constant */ var tableTitleSepRE = /^\s*\|?(?:\s*\:?\s*\-+\s*\:?\s*\|)*\s*\:?\s*\-+\s*\:?\s*\|?\s*$/ // find  |:-----:|:-----:| line

  /** @constant */ var insideValues = {
    math: 1,
    listSpace: 2,
    tableTitleSep: 4, // a line like |:-----:|:-----:| 
  }

  /** @constant */ var nstyleValues = {
    /* ....xxxx [standalone]  */ DEL: 0x01, EM: 0x02, STRONG: 0x04, ESCAPE: 0x08,
    /* ####.... link relative */ LINK: 0x10, BARELINK: 0x20, FOOTREF: 0x30, FOOTREF_BEGIN: 0x40, FOOTNOTE_NAME: 0x50,  // FOOTREF_BEGIN: ^ is not scanned
  }

  CodeMirror.defineMode("hypermd", function (config, modeConfig) {
    var hypermdOverlay = {
      startState: function () {
        return {
          atBeginning: true,  //at the beginning of one line, quotes are skipped
          insideCodeFence: false,
          quoteLevel: 0,
          nstyle: 0,   // non-exclusive statuses, stored in bit format. see nstyleValues
          table: null, // if inside a table, the table ID (volatile and maybe duplicate)
          tableCol: 0, // current table Column Number
          tableRow: 0, // current table row number
          inside: null, // see insideValues
          listSpaceStack: [], // spaces for every levels like [1, 2, 2] ...
          // NOTICE: listSpaceStack[0] could be 0, (eg. ordered list, or " - "'s leading space is missing)
          //         if meet the situation, do not return any token, otherwise CodeMirror would crash
          prevLineIsEmpty: false,
          extra: null,   // reserved, works with "inside"
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
          nstyle: s.nstyle,
          table: s.table,
          tableCol: s.tableCol,
          tableRow: s.tableRow,
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
        s.table = null
        s.tableCol = 0
        s.tableRow = 0
        s.nstyle = 0

        if (s.insideCodeFence) return "line-HyperMD-codeblock line-background-HyperMD-codeblock-bg"
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

        if (state.inside === insideValues.math) {
          if (
            (start === 0 || stream.string.charAt(start - 1) !== "\\") &&
            stream.match(state.extra)
          ) {
            state.inside = null
            return "formatting formatting-math formatting-math-end math math-" + state.extra.length
          }
          stream.next()
          return "math math-" + state.extra.length
        }

        //////////////////////////////////////////////////////////////////
        /// start process one raw line
        if (start === 0) {
          // Now we are at the beginning of current line
          state.atBeginning = true
          if (state.table) {
            state.tableCol = 0
            state.tableRow++
            if (state.tableRow === 1 && tableTitleSepRE.test(stream.string)) {
              // this line is  |:-----:|:-----:| 
              // HyperMD must handle it, otherwise CodeMirror will treat `:---:` as emoji
              state.inside = insideValues.tableTitleSep
            } else {
              state.inside = null
            }
          }

          var indentation = stream.indentation()

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
            var fence_type = state.insideCodeFence ? 'begin' : 'end'
            return "line-HyperMD-codeblock line-background-HyperMD-codeblock-bg line-HyperMD-codeblock-" + fence_type
          }

          /**
           * if insideCodeFence, nothing to process.
           */
          if (state.insideCodeFence) {
            stream.skipToEnd()
            state.combineTokens = true
            return "line-HyperMD-codeblock line-background-HyperMD-codeblock-bg"
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
            return "line-HyperMD-codeblock line-background-HyperMD-codeblock-indented-bg"
          }

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
          if (stream.match(/^(#+)(?:\s|$)/)) {
            state.combineTokens = true
            return "line-HyperMD-header line-HyperMD-header-" + stream.string.match(/^#+/)[0].length
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
            state.inside = insideValues.listSpace
            state.extra = 0
          }
        }

        // following `if (state.listSpaceStack.length !== 0 || stream.match(listRE, false))` 's status
        if (state.inside === insideValues.listSpace) {
          var listLevel = state.listSpaceStack.length
          var firstMet = state.extra === 0

          if (firstMet && state.listSpaceStack[0] === 0) {
            // skip this virtual token. see listSpaceStack's comment above
            state.extra++
          }

          var ans = null
          if (state.extra >= listLevel) {
            // edge case: "1. xxxxx" where virtual token (indent length=0) skipped just now
            // and no more list indent. Now exit "listSpace" status and eat the bullet symbol
            state.inside = null
            state.extra = null
            if (!stream.match(listRE)) stream.next()
          } else {
            var indent_to_eat = state.listSpaceStack[state.extra]
            var corrupted = false
            while (indent_to_eat > 0) {
              var next_ch = stream.next()
              if (next_ch === "\t") indent_to_eat -= 4
              else if (next_ch === " ") indent_to_eat -= 1
              else {
                // FIXME: User made a corrupted indent. How to solve?
                state.inside = null
                state.extra = null
                corrupted = true
                break
              }
            }

            //FIXME: deal with indent_to_eat < 0

            ans = "hmd-list-indent hmd-list-indent-" + (state.extra + 1)
            if (firstMet) ans += " line-HyperMD-list-line line-HyperMD-list-line-" + listLevel
            if (corrupted) ans += " hmd-list-indent-corrupted"

            if (++state.extra >= listLevel) {
              // this is the last indenting space, going to exit "listSpace" status
              state.inside = null
              state.extra = null
            }
          }

          state.combineTokens = true
          return ans
        }

        //////////////////////////////////////////////////////////////////
        /// now list bullets and quote indents are gone. Enter the content.
        
        var atBeginning = state.atBeginning // whether is at beginning (ignoreing `#`, `>` and list bullets)
        if (atBeginning && /\S/.test(stream.peek())) state.atBeginning = false

        // then just normal inline stuffs
        // usually we just add some extra styles to CodeMirror's result
        state.combineTokens = true

        switch (state.inside) {
          case insideValues.tableTitleSep:
            /// tableTitleSep line doesn't need any styling
            if (stream.match(/^(?:\:\s*)?-+(?:\s*\:)?/)) {
              state.combineTokens = false
              return "hmd-table-title-dash line-HyperMD-table-row line-HyperMD-table-rowsep "
            }
            break
        }

        /// inline code
        if (stream.match(/^`[^`]*`?/)) {
          return null // inline code are ignored by hypermd
        }

        /// inline math
        tmp = stream.match(/^\${1,2}/)
        if (tmp && (
          tmp[0] === '$$' ||    // `$$` may span lines
          /[^\\]\$/.test(stream.string.substr(start + 1))  // `$` can't. there must be another `$` after current one
        )) {
          state.inside = insideValues.math
          state.extra = tmp[0]
          state.combineTokens = false
          return "formatting formatting-math formatting-math-begin math math-" + state.extra.length // inline code are ignored by hypermd
        }

        ////////////////////////////////////////////////////////////////////////////////////////
        /// possible table
        /// NOTE: only the pipe chars whose nstyle === 0 can construct a table
        ///       no need to worry about nstyle stuff

        if (state.nstyle === 0 && stream.eat('|')) {
          var ans = ""
          if (!state.table) {
            if (!/^\s*\|/.test(stream.string) && !tableTitleSepRE.test(stream.lookAhead(1))) {
              // a leading pipe char (|) or an extra |:-----:|:-----:| line 
              // is required, but not found, thus we can't establish a table 
              return null
            }

            // this is a new table!
            state.table = "T" + stream.lineOracle.line
            state.tableRow = 0
            ans += "line-HyperMD-table-title "

            if (tableTitleSepRE.test(stream.lookAhead(1))) {
              // a |:-----:|:----:| line exists
              ans += "line-HyperMD-table-title-has_rowsep "
            }
          }

          if (state.tableCol === 0) {
            ans += "line-HyperMD-table_" + state.table + " "
            ans += "line-HyperMD-table-row line-HyperMD-table-row-" + state.tableRow + " "
          }

          ans += "hmd-table-sep hmd-table-sep-" + state.tableCol + " "

          state.tableCol++
          return ans
        }

        ///////////////////////////////////////////////////////////////////
        // now process mixable (non-exclusive) styles
        // if nstyle changes, do `return` at once

        /** @constant */ var nstyle = state.nstyle
        /** @constant */ var ns_link = nstyle & 0xF0
        var ans = ""

        // current style is ....

        if (ns_link !== 0) {
          switch (ns_link) {
            case nstyleValues.FOOTNOTE_NAME:
              ans += "hmd-footnote "
              break
            case nstyleValues.FOOTREF_BEGIN:
              ans += "hmd-footref-lead "
            case nstyleValues.FOOTREF:
              ans += "hmd-footref "
            case nstyleValues.BARELINK:
              ans += "hmd-barelink "
            // case nstyleValues.LINK:  // HyperMD mode doesn't care about normal link
          }
        }

        ///////////////////////////////////////
        /// start changing nstyle (if needed)

        /// exiting escape

        if (nstyle & nstyleValues.ESCAPE) {
          ans += "hmd-escape hmd-escape-char "
          state.nstyle -= nstyleValues.ESCAPE

          stream.next()
          return ans
        }

        /// entering escape?

        if (stream.match(/^\\(?=.)/)) {
          // found the backslash
          state.nstyle |= nstyleValues.ESCAPE
          ans += "formatting-hmd-escape hmd-escape hmd-escape-backslash "
          return ans
        }

        /// enter/exit a link/footref/bare-link/footnote

        if (ns_link === 0) {
          if (stream.match(/^\[([^\]]+)\]/, false)) {
            /// found a start
            stream.next()
            if (atBeginning && stream.match(/^(?:[^\]]+)\]\:/, false)) {
              // found a beginning of footnote
              state.nstyle |= nstyleValues.FOOTNOTE_NAME
              ans += "hmd-footnote "
            } else if (stream.match(/^(?:[^\]]+)\](?:[^\[\(]|$)/, false)) {
              // a [bare link] could be a [^footref]
              if (stream.peek() === '^') {
                state.nstyle |= nstyleValues.FOOTREF_BEGIN
                ans += "hmd-barelink hmd-footref "
              } else {
                state.nstyle |= nstyleValues.BARELINK
                ans += "hmd-barelink "
              }
            } else {
              state.nstyle |= nstyleValues.LINK
            }
            return ans
          }
        } else {
          // current is inside a link
          switch (ns_link) {
            case nstyleValues.FOOTREF_BEGIN:
              // caught the "^"
              state.nstyle = nstyle & ~0xF0 | nstyleValues.FOOTREF
              stream.next()
              return ans
            case nstyleValues.FOOTREF:
            case nstyleValues.BARELINK:
            case nstyleValues.LINK:
              if (stream.eat(']')) {
                state.nstyle = nstyle & ~0xF0
                return ans
              }
            case nstyleValues.FOOTNOTE_NAME:
              if (stream.match(']:')) {
                state.nstyle = nstyle & ~0xF0
                return ans
              }
          }
        }

        /// skip some normal Markdown inline stuff

        if (stream.match("**")) { state.nstyle ^= nstyleValues.STRONG; return ans }
        if (stream.match("__")) { state.nstyle ^= nstyleValues.STRONG; return ans }
        if (stream.match(/^[*_]/)) { state.nstyle ^= nstyleValues.EM; return ans }
        if (stream.match("~~")) { state.nstyle ^= nstyleValues.DEL; return ans }

        /// finally, if nothing changed, move on
        stream.next()
        return (ans.length !== 0 ? ans : null)
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