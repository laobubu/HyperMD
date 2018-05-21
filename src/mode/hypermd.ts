// CodeMirror, copyright (c) by laobubu
// Distributed under an MIT license: http://codemirror.net/LICENSE
//
// This is a patch to markdown mode. Supports lots of new features
//

import CodeMirror from "codemirror"
import "codemirror/mode/markdown/markdown"
import "codemirror/addon/mode/overlay"

const possibleTokenChars: string = "`\\[]()<>_*~$|^@:!#+\""   // chars that could form a token (like "**" or "`")

const meanlessCharsRE = new RegExp("^[^\\" + possibleTokenChars.split("").join("\\") + "\\s]+")  // RegExp that match one or more meanless chars
const listRE = /^\s*(?:[*\-+]|[0-9]+([.)]))\s+/  // this regex is from CodeMirror's sourcecode
const tableTitleSepRE = /^\s*\|?(?:\s*\:?\s*\-+\s*\:?\s*\|)*\s*\:?\s*\-+\s*\:?\s*\|?\s*$/ // find  |:-----:|:-----:| line
const urlRE = /^((?:(?:aaas?|about|acap|adiumxtra|af[ps]|aim|apt|attachment|aw|beshare|bitcoin|bolo|callto|cap|chrome(?:-extension)?|cid|coap|com-eventbrite-attendee|content|crid|cvs|data|dav|dict|dlna-(?:playcontainer|playsingle)|dns|doi|dtn|dvb|ed2k|facetime|feed|file|finger|fish|ftp|geo|gg|git|gizmoproject|go|gopher|gtalk|h323|hcp|https?|iax|icap|icon|im|imap|info|ipn|ipp|irc[6s]?|iris(?:\.beep|\.lwz|\.xpc|\.xpcs)?|itms|jar|javascript|jms|keyparc|lastfm|ldaps?|magnet|mailto|maps|market|message|mid|mms|ms-help|msnim|msrps?|mtqp|mumble|mupdate|mvn|news|nfs|nih?|nntp|notes|oid|opaquelocktoken|palm|paparazzi|platform|pop|pres|proxy|psyc|query|res(?:ource)?|rmi|rsync|rtmp|rtsp|secondlife|service|session|sftp|sgn|shttp|sieve|sips?|skype|sm[bs]|snmp|soap\.beeps?|soldat|spotify|ssh|steam|svn|tag|teamspeak|tel(?:net)?|tftp|things|thismessage|tip|tn3270|tv|udp|unreal|urn|ut2004|vemmi|ventrilo|view-source|webcal|wss?|wtai|wyciwyg|xcon(?:-userid)?|xfire|xmlrpc\.beeps?|xmpp|xri|ymsgr|z39\.50[rs]?):(?:\/{1,3}|[a-z0-9%])|www\d{0,3}[.]|[a-z0-9.\-]+[.][a-z]{2,4}\/)(?:[^\s()<>]|\([^\s()<>]*\))+(?:\([^\s()<>]*\)|[^\s`*!()\[\]{};:'".,<>?«»“”‘’]))/i // from CodeMirror/mode/gfm
const url2RE = /^\.{0,2}\/[^\>\s]+/

const enum insideValues {
  nothing = 0,
  math,
  listSpace,
  codeFence,
  tableTitleSep, // a line like |:-----:|:-----:|
}

const enum nstyleValues {
  /* offset 0-7 [standalone bits]  */

  _style_mask = 0xFF,
  _style_offset = 0,

  DEL = 1 << 0,
  EM = 1 << 1,
  STRONG = 1 << 2,
  ESCAPE = 1 << 3,

  /* offset 8-15 link relative */

  _link_mask = 0xFF00,
  _link_offset = 8,

  LINK = 1 << _link_offset,           // [Link](url) or [Link][foot]  [text] part
  LINK_URL = 2 << _link_offset,       // [Link](url)    (url)  part
  LINK_URL_S = 3 << _link_offset,     // [Link][foot]   [foot] part
  BARELINK = 4 << _link_offset,       // [BareLink]
  FOOTREF = 5 << _link_offset,        // [^ref]         ONLY CHARS AFTER ^
  FOOTREF_BEGIN = 6 << _link_offset,  // [^ref]         the first two chars [^
  FOOTNOTE_NAME = 7 << _link_offset,  // [^footnote]:
  FOOTNOTE_URL = 8 << _link_offset,   // [^foot]: http://xxx   the URL (if exists)
  URL_A = 9 << _link_offset,          // <http://xxx>   url with angle brackets

  /* offset 16-23 [standalone helper bits] */

  _helper_mask = 0xFF0000,
  _helper_offset = 16,
}

/** these styles only need 1 bit to record the status */
const nstyleStandalone = [
  nstyleValues.DEL,
  nstyleValues.EM,
  nstyleValues.STRONG,
  nstyleValues.ESCAPE,
]

/** style strings */
const HMDStyles = {
  // ESCAPE
  [nstyleValues.ESCAPE]: "hmd-escape ",

  // Link related
  [nstyleValues.LINK]: "hmd-link ",
  [nstyleValues.LINK_URL]: "hmd-link-url ",
  [nstyleValues.LINK_URL_S]: "hmd-link-url hmd-link-url-s ",
  [nstyleValues.BARELINK]: "hmd-barelink ",
  [nstyleValues.FOOTREF]: "hmd-barelink hmd-footref ",
  [nstyleValues.FOOTREF_BEGIN]: "hmd-barelink hmd-footref hmd-footref-lead ",
  [nstyleValues.FOOTNOTE_NAME]: "hmd-footnote line-HyperMD-footnote ",
  [nstyleValues.FOOTNOTE_URL]: "hmd-footnote-url ",
  [nstyleValues.URL_A]: "url ",
}

CodeMirror.defineMode("hypermd", function (config, modeConfig) {
  function startState() {
    return {
      atBeginning: true,  //at the beginning of one line, quotes are skipped
      quoteLevel: 0,
      nstyle: 0,   // non-exclusive statuses, stored in bit format. see nstyleValues
      table: null, // if inside a table, the table ID (volatile and maybe duplicate)
      tableCol: 0, // current table Column Number
      tableRow: 0, // current table row number
      inside: insideValues.nothing, // see insideValues
      listSpaceStack: [], // spaces for every levels like [1, 2, 2] ...
      // NOTICE: listSpaceStack[0] could be 0, (eg. ordered list, or " - "'s leading space is missing)
      //         if meet the situation, do not return any token, otherwise CodeMirror would crash
      prevLineIsEmpty: false,
      extra: null,   // reserved, works with "inside"
      // when inside "math", this is the token like `$` or `$$`
      // when insnde "listSpace", this is the index of listSpaceStack(array)
    };
  }

  interface State extends ReturnType<typeof startState> {
    combineTokens?: boolean // introduced by codemirror/addon/mode/overlay
  }

  const hypermdOverlay: CodeMirror.Mode<State> = {
    startState,
    copyState(s): State {
      return {
        // structure of `s` is defined in startState; do a deep copy for it
        atBeginning: s.atBeginning,
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
    blankLine(s) {
      s.atBeginning = true
      s.prevLineIsEmpty = true
      s.quoteLevel = 0
      s.listSpaceStack = []
      s.table = null
      s.tableCol = 0
      s.tableRow = 0
      s.nstyle = 0

      if (s.inside === insideValues.codeFence) return "line-HyperMD-codeblock line-background-HyperMD-codeblock-bg"
      return null
    },
    token(stream, state) {
      state.combineTokens = null;

      var start = stream.pos
      var retToken
      var tmp: RegExpMatchArray

      switch (state.inside) {
        case insideValues.math:
          if (
            (start === 0 || stream.string.charAt(start - 1) !== "\\") &&
            stream.match(state.extra)
          ) {
            state.inside = insideValues.nothing
            return "formatting formatting-math formatting-math-end math math-" + state.extra.length
          }
          if (!stream.match(/^(?:[^\$\\]+|\\.)+/)) stream.next() // skip chars that can't be "$" or "$$"
          return "math math-" + state.extra.length

        case insideValues.codeFence:
          state.combineTokens = true
          if (start === 0 && stream.match(/^```\s*$/)) {
            // reach the end of CodeFence
            state.inside = insideValues.nothing
            return "line-HyperMD-codeblock line-background-HyperMD-codeblock-bg line-HyperMD-codeblock-end"
          }
          stream.skipToEnd()
          return "line-HyperMD-codeblock line-background-HyperMD-codeblock-bg"
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
          state.inside = insideValues.codeFence
          return "line-HyperMD-codeblock line-background-HyperMD-codeblock-bg line-HyperMD-codeblock-begin"
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
        var ans = ""

        if (firstMet && state.listSpaceStack[0] === 0) {
          if (listLevel === 1) {
            // oops, this is level-1 list without indentation!
            // do some dirty job to add HyperMD styles

            state.inside = null
            state.extra = null
            state.combineTokens = true

            if (!stream.match(listRE)) stream.next()

            return "line-HyperMD-list-line line-HyperMD-list-line-1"
          }

          // skip this virtual token. see listSpaceStack's comment above
          state.extra++
          ans += "hmd-list-indent-virtual "
        }

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

        ans += "hmd-list-indent hmd-list-indent-" + (state.extra + 1)
        if (firstMet) ans += " line-HyperMD-list-line line-HyperMD-list-line-" + listLevel
        if (corrupted) ans += " hmd-list-indent-corrupted"

        if (++state.extra >= listLevel) {
          // this is the last indenting space, going to exit "listSpace" status
          state.inside = null
          state.extra = null
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
          state.combineTokens = false
          var ans = ""
          if (stream.match(/^(?:\:\s*)?-+(?:\s*\:)?/)) {
            ans += "hmd-table-title-dash line-HyperMD-table-row line-HyperMD-table-rowsep "
          } else if (stream.eat("|")) {
            if (state.tableCol === 0) {
              ans += "line-HyperMD-table_" + state.table + " "
              ans += "line-HyperMD-table-row line-HyperMD-table-row-" + state.tableRow + " "
            }
            ans += "hmd-table-sep hmd-table-sep-" + state.tableCol
            state.tableCol++
          } else {
            stream.eatWhile(/^[^\|\-\:]+/) || stream.next()
          }
          return ans
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

      const canMakeTable = state.nstyle === 0 && !state.listSpaceStack.length && !state.inside
      if (canMakeTable && stream.eat('|')) {
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

      const nstyle = state.nstyle
      let ns_link: nstyleValues = nstyle & nstyleValues._link_mask

      var ans = ""

      // initialize style string by `nstyle`
      for (let s of nstyleStandalone) if (nstyle & s) ans += HMDStyles[s] || ""
      if (ns_link) ans += HMDStyles[ns_link] || ""

      ///////////////////////////////////////////////////////////////////
      // Update nstyle if needed
      //
      // NOTE:
      // 0. when activating a nstyle (usually `state.nstyle |= xxx`),
      //    do not forget `ans += HMDStyles[xxx]`
      // 1. once nstyle changes, no matter activating or de-activating,
      //    you MUST `return ans` immediately!

      { /// LINK related
        let new_ns_link: nstyleValues = null

        if (ns_link === 0) {
          // try to find a beginning

          if (stream.match(/^\[((?:[^\]\\\`]|\\.|\`[^\`]*\`)+)\]/, false)) {
            // found! now decide `ns_link`

            stream.next()

            if (atBeginning && stream.match(/^(?:[^\]]+)\]\:/, false)) {
              // found a beginning of footnote
              new_ns_link = nstyleValues.FOOTNOTE_NAME
            } else if (stream.match(/^(?:[^\]]+)\](?:[^\[\(]|$)/, false)) {
              // find a bare link
              if (stream.peek() === '^') {
                // a [bare link] could be a [^footref]
                new_ns_link = nstyleValues.FOOTREF_BEGIN
              } else {
                new_ns_link = nstyleValues.BARELINK
              }
            } else {
              // find a normal link text
              new_ns_link = nstyleValues.LINK
            }
          } else if (tmp = stream.match(/^\<([^\>]+)\>/, false)) {
            if (urlRE.test(tmp[1]) || url2RE.test(tmp[1])) {
              // found <http://laobubu.github.io/> or <./xxx.html>
              stream.next() // eat "<"
              ans += "formatting formatting-url "
              new_ns_link = nstyleValues.URL_A
            }
          }

          if (new_ns_link !== null) {
            // apply changes and prevent further HyperMD parsing work
            state.nstyle |= new_ns_link
            ans += HMDStyles[new_ns_link]
            return ans
          }
        } else {
          // current is inside a link. check if we shall change status

          // making any change to `ns_link` will prevent further HyperMD parsing work

          switch (ns_link) {
            case nstyleValues.FOOTREF_BEGIN:
              // caught the "^"
              new_ns_link = nstyleValues.FOOTREF
              stream.next()
              break
            case nstyleValues.FOOTREF:
            case nstyleValues.BARELINK:
              if (stream.eat(']')) new_ns_link = 0
              break
            case nstyleValues.FOOTNOTE_NAME:
              if (stream.match(']:')) {
                new_ns_link = 0
                let mat = stream.match(/^\s*(\S+)/, false)
                if (mat && (urlRE.test(mat[1]) || url2RE.test(mat[1]))) new_ns_link = nstyleValues.FOOTNOTE_URL
              }
              break
            case nstyleValues.FOOTNOTE_URL:
              stream.match(/^\s*\S+/) || stream.next()
              new_ns_link = 0
              break
            case nstyleValues.LINK:
              // entering LINK_URL status because the next char must be ( or [
              if (stream.eat(']')) {
                if (stream.peek() === '[') new_ns_link = nstyleValues.LINK_URL_S
                else new_ns_link = nstyleValues.LINK_URL
              }
              break
            case nstyleValues.LINK_URL:
            case nstyleValues.LINK_URL_S:
              let rightParentheses = (ns_link === nstyleValues.LINK_URL_S) ? ']' : ')'
              if (stream.match(/^"(?:[^"\\]|\\.)*"/)) {
                // skip quoted stuff (could contains parentheses )
                // note: escaped char is handled in `ESCAPE related` part
                return ans // URL part doesnot need further styling
              } else if (stream.eat(rightParentheses)) {
                // find the tail
                new_ns_link = 0
              } else {
                // just skip meanless chars
                if (!stream.match(/^[^\]\)\\]+|^\\./)) stream.next()
                return ans // URL part doesnot need further styling
              }
              break
            case nstyleValues.URL_A:
              if (stream.eat(">")) {
                // find the tail
                ans += "formatting formatting-url "
                new_ns_link = 0
              } else {
                stream.match(urlRE) || stream.match(url2RE) || stream.next()
                return ans // URL part doesnot need further styling
              }
              break
          }

          if (new_ns_link !== null) {
            // apply changes and prevent further HyperMD parsing work
            state.nstyle = state.nstyle & ~nstyleValues._link_mask | new_ns_link
            return ans
          }
        }
      }

      { /// ESCAPE related
        if (nstyle & nstyleValues.ESCAPE) {
          stream.next()
          state.nstyle -= nstyleValues.ESCAPE
          return ans
        }

        /// entering escape?
        if (stream.match(/^\\(?=.)/)) {
          // found the backslash
          state.nstyle |= nstyleValues.ESCAPE
          ans += HMDStyles[nstyleValues.ESCAPE]

          ans += "hmd-escape-backslash "
          return ans
        }
      }

      if ((state.nstyle & nstyleValues._style_mask) !== 0 || !/\w/.test(stream.string.charAt(stream.pos - 1))) {
        /// DEL, EM, STRONG etc. simple styles
        // since these styles are not coverd by HMDStyles,
        // we can do it simplier: change nstyle and return immediatly
        if (stream.match("**")) { state.nstyle ^= nstyleValues.STRONG; return ans }
        if (stream.match("__")) { state.nstyle ^= nstyleValues.STRONG; return ans }
        if (stream.eat("*")) { state.nstyle ^= nstyleValues.EM; return ans }
        if (stream.eat("_")) { state.nstyle ^= nstyleValues.EM; return ans }
        if (stream.match("~~")) { state.nstyle ^= nstyleValues.DEL; return ans }
      }

      ///////////////////////////////////////////////////////////////////
      // Finally, if nothing changed, move on

      if (stream.match(urlRE)) ans += "url "
      else if (!stream.match(meanlessCharsRE)) stream.next()
      return (ans.length !== 0 ? ans : null)
    }
  };

  var markdownConfig = {
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
      list1: "list-1",
      list2: "list-2",
      list3: "list-3",
      code: "inline-code",
      gitHubSpice: false
    },
  };
  for (var attr in modeConfig) {
    markdownConfig[attr] = modeConfig[attr];
  }
  markdownConfig["name"] = "markdown" // must be this

  var finalMode = CodeMirror.overlayMode(CodeMirror.getMode(config, markdownConfig), hypermdOverlay);

  // // now deal with indent method
  // var baseIndent = finalMode.indent;
  // finalMode.indent = function (state, textAfter) {
  //   console.log("INDENT", arguments)
  //   return baseIndent ? baseIndent(state, textAfter) : CodeMirror.Pass
  // }

  return finalMode
}, "markdown");

CodeMirror.defineMIME("text/x-hypermd", "hypermd");
