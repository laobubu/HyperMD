// CodeMirror, copyright (c) by laobubu
// Distributed under an MIT license: http://codemirror.net/LICENSE
//
// This is a patch to markdown mode. Supports lots of new features
//

import CM from "codemirror"
import { assign } from "../core";
import "codemirror/mode/markdown/markdown"
import "codemirror/mode/stex/stex"

const listRE = /^(?:[*\-+]|^[0-9]+([.)]))\s+/
const urlRE = /^((?:(?:aaas?|about|acap|adiumxtra|af[ps]|aim|apt|attachment|aw|beshare|bitcoin|bolo|callto|cap|chrome(?:-extension)?|cid|coap|com-eventbrite-attendee|content|crid|cvs|data|dav|dict|dlna-(?:playcontainer|playsingle)|dns|doi|dtn|dvb|ed2k|facetime|feed|file|finger|fish|ftp|geo|gg|git|gizmoproject|go|gopher|gtalk|h323|hcp|https?|iax|icap|icon|im|imap|info|ipn|ipp|irc[6s]?|iris(?:\.beep|\.lwz|\.xpc|\.xpcs)?|itms|jar|javascript|jms|keyparc|lastfm|ldaps?|magnet|mailto|maps|market|message|mid|mms|ms-help|msnim|msrps?|mtqp|mumble|mupdate|mvn|news|nfs|nih?|nntp|notes|oid|opaquelocktoken|palm|paparazzi|platform|pop|pres|proxy|psyc|query|res(?:ource)?|rmi|rsync|rtmp|rtsp|secondlife|service|session|sftp|sgn|shttp|sieve|sips?|skype|sm[bs]|snmp|soap\.beeps?|soldat|spotify|ssh|steam|svn|tag|teamspeak|tel(?:net)?|tftp|things|thismessage|tip|tn3270|tv|udp|unreal|urn|ut2004|vemmi|ventrilo|view-source|webcal|wss?|wtai|wyciwyg|xcon(?:-userid)?|xfire|xmlrpc\.beeps?|xmpp|xri|ymsgr|z39\.50[rs]?):(?:\/{1,3}|[a-z0-9%])|www\d{0,3}[.]|[a-z0-9.\-]+[.][a-z]{2,4}\/)(?:[^\s()<>]|\([^\s()<>]*\))+(?:\([^\s()<>]*\)|[^\s`*!()\[\]{};:'".,<>?«»“”‘’]))/i // from CodeMirror/mode/gfm
const url2RE = /^\.{0,2}\/[^\>\s]+/

type TokenFunc = (stream: CodeMirror.StringStream, state: HyperMDState) => string

interface MarkdownStateLine {
  stream: CodeMirror.StringStream,
  header?: boolean
  hr?: boolean
  fencedCodeEnd?: boolean
}

interface MarkdownState {
  f: TokenFunc,

  prevLine: MarkdownStateLine,
  thisLine: MarkdownStateLine,

  block: TokenFunc,
  htmlState: any, // HTMLState
  indentation: number,

  localMode: CodeMirror.Mode<any>
  localState: any

  inline: TokenFunc,
  text: TokenFunc,

  formatting: string | string[] | false,
  linkText: boolean,
  linkHref: boolean,
  linkTitle: boolean,

  /** -1 means code-block and +1,2,3... means ``inline ` quoted codes`` */
  code: false | number,
  em: false | string,
  strong: false | string,
  header: number,
  setext: 0 | 1 | 2, // current line is afxHeader before ---- ======
  hr: boolean,
  taskList: boolean,
  list: boolean,
  listStack: number[],
  quote: number,
  indentedCode: boolean,
  trailingSpace: number,
  trailingSpaceNewLine: boolean,
  strikethrough: boolean,
  emoji: boolean,
  fencedEndRE: null | RegExp // usually is /^```+ *$/

  // temp
  indentationDiff?: number, // indentation minus list's indentation
}

interface HyperMDState extends MarkdownState {
  hmdTable: TableType
  hmdTableID: string
  hmdTableCol: number
  hmdTableRow: number
  hmdOverride: TokenFunc
  hmdInnerStyle: string
  hmdInnerExitStyle: string
  hmdInnerExitTag: string

  hmdInnerMode: CodeMirror.Mode<any>
  hmdInnerState: any

  hmdLinkType: LinkType
  hmdNextMaybe: NextMaybe
}

const enum TableType {
  NONE = 0,
  SIMPLE,     //   table | column
  NORMAL,     // | table | column |
}

const SimpleTableRE = /^\s*[^|].*?\|.*[^|]\s*$/
const SimpleTableLooseRE = /^\s*[^\|].*\|/ // unfinished | row
const SimpleTableSepRE = /^(?:\s*\:?\s*\-+\s*\:?\s*\|)+\s*\:?\s*\-+\s*\:?\s*$/ // :-----:|:-----:
const NormalTableRE = /^\s*\|\s.*?\s\|\s.*?\s\|\s*$/
const NormalTableLooseRE = /^\s*\|/ // | unfinished row
const NormalTableSepRE = /^\s*\|(?:\s*\:?\s*---+\s*\:?\s*\|){2,}\s*$/ // find  |:-----:|:-----:| line

const enum NextMaybe {
  NONE = 0,
}

const enum LinkType {
  NONE = 0,
  BARELINK,  // [link]
  FOOTREF,   // [^ref]
  NORMAL,    // [text](url) or [text][doc]
  FOOTNOTE,  // [footnote]:
  MAYBE_FOOTNOTE_URL, // things after colon
}

const linkStyle = {
  [LinkType.BARELINK]: "hmd-barelink",
  [LinkType.FOOTREF]: "hmd-barelink hmd-footref",
  [LinkType.FOOTNOTE]: "hmd-footnote line-HyperMD-footnote",
}

CM.defineMode("hypermd", function (cmCfg, modeCfgUser) {
  var modeCfg = {
    table: true,

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
  }
  assign(modeCfg, modeCfgUser)
  modeCfg["name"] = "markdown"

  var rawMode: CodeMirror.Mode<MarkdownState> = CM.getMode(cmCfg, modeCfg)
  var newMode: CodeMirror.Mode<HyperMDState> = assign({}, rawMode) as any

  newMode.startState = function () {
    var ans = rawMode.startState() as HyperMDState
    ans.hmdTable = TableType.NONE
    ans.hmdOverride = null
    ans.hmdInnerExitTag = null
    ans.hmdInnerExitStyle = null
    ans.hmdInnerMode = null
    ans.hmdLinkType = LinkType.NONE
    ans.hmdNextMaybe = NextMaybe.NONE
    return ans
  }

  newMode.copyState = function (s) {
    var ans = rawMode.copyState(s) as HyperMDState
    const keys: (keyof HyperMDState)[] = [
      "hmdLinkType", "hmdNextMaybe",
      "hmdTable", "hmdTableID", "hmdTableCol", "hmdTableRow",
      "hmdOverride",
      "hmdInnerMode", "hmdInnerExitTag", "hmdInnerExitStyle",
    ]
    for (const key of keys) ans[key] = s[key]

    if (s.hmdInnerMode) ans.hmdInnerState = CM.copyState(s.hmdInnerMode, s.hmdInnerState)

    return ans
  }

  newMode.blankLine = function (state) {
    var ans = rawMode.blankLine(state) || ""
    if (state.code === -1) {
      ans += " line-HyperMD-codeblock line-background-HyperMD-codeblock-bg"
    }
    if (state.hmdTable) {
      state.hmdTable = TableType.NONE
      state.hmdTableID = null
    }
    return ans || null
  }

  newMode.token = function (stream, state) {
    if (state.hmdOverride) return state.hmdOverride(stream, state)

    const wasInHTML = !!state.htmlState
    const wasInCodeFence = state.code === -1
    const bol = stream.start === 0
    const firstTokenOfLine = stream.column() === state.indentation

    const wasLinkText = state.linkText

    var ans = ""
    var tmp: RegExpMatchArray

    //#region Math

    if (!state.code && !wasInHTML && (tmp = stream.match(/^\${1,2}/, false))) {
      let tag = tmp[0], mathLevel = tag.length
      if (mathLevel === 2 || stream.string.indexOf(tag, stream.pos + mathLevel) !== -1) {
        // $$ may span lines, $ must be paired
        ans += enterMode(stream, state, "stex", tag) || ""
        ans += " formatting formatting-math formatting-math-begin math math-" + mathLevel
        state.hmdInnerStyle = "math"
        state.hmdInnerExitStyle = "formatting formatting-math formatting-math-end math math-" + mathLevel
        return ans
      }
    }

    //#endregion

    // now enter markdown

    ans += " " + (rawMode.token(stream, state) || "")
    var current = stream.current()

    const inHTML = !!state.htmlState
    const inCodeFence = state.code === -1
    const inMarkdown = !(inHTML || inCodeFence || wasInCodeFence || wasInHTML)

    if (inHTML != wasInHTML) {
      if (inHTML) ans += " hmd-html-begin"
      else ans += " hmd-html-end"
    }

    if (wasInCodeFence || inCodeFence) {
      if (!state.localMode || !wasInCodeFence) ans = ans.replace("inline-code", "")
      ans += " line-HyperMD-codeblock line-background-HyperMD-codeblock-bg"
      if (inCodeFence !== wasInCodeFence) {
        if (!inCodeFence) ans += " line-HyperMD-codeblock-end"
        else if (!wasInCodeFence) ans += " line-HyperMD-codeblock-begin"
      }
    }

    if (inMarkdown) {
      let tableType = state.hmdTable

      //#region [Table] Reset
      if (bol && tableType) {
        const rowRE = (tableType == TableType.SIMPLE) ? SimpleTableLooseRE : NormalTableLooseRE
        if (rowRE.test(stream.string)) {
          // still in table
          state.hmdTableCol = 0
          state.hmdTableRow++
        } else {
          // end of a table
          state.hmdTable = tableType = TableType.NONE
          state.hmdTableID = null
        }
      }
      //#endregion

      //#region Header, indentedCode, quote

      if (state.header) {
        if (!state.prevLine.header) {
          ans += " line-HyperMD-header line-HyperMD-header-" + state.header
        } else {
          ans += " line-HyperMD-header-line line-HyperMD-header-line-" + state.header
        }
      }

      if (state.indentedCode) {
        ans += " hmd-indented-code"
      }

      if (state.quote && current.charAt(0) !== ">") {
        ans += " line-HyperMD-quote line-HyperMD-quote-" + state.quote
      }

      //#endregion

      //#region List

      let tokenIsIndent = bol && /^\s+$/.test(current)
      let tokenIsListBullet = state.list && /formatting-list/.test(ans)

      if (tokenIsListBullet || (tokenIsIndent && (state.list || stream.match(listRE, false)))) {
        let listLevel = state.listStack && state.listStack.length || 0
        if (tokenIsIndent) {
          if (stream.match(listRE, false)) { // next token is 1. 2. or bullet
            if (!state.list) listLevel++
          } else {
            ans += ` line-HyperMD-list-line-nobullet line-HyperMD-list-line line-HyperMD-list-line-${listLevel}`
          }
          ans += ` hmd-list-indent hmd-list-indent-${listLevel}`
        } else if (tokenIsListBullet) {
          // no space before bullet!
          ans += ` line-HyperMD-list-line line-HyperMD-list-line-${listLevel}`
        }
      }

      //#endregion

      //#region Link, BareLink, Footnote etc

      if (wasLinkText !== state.linkText) {
        if (!wasLinkText) {
          // entering a link
          tmp = stream.match(/^([^\]]+)\](\(| ?\[|\:)?/, false) || ["](", "", "("] // make a fake link
          if (!tmp[2]) { // barelink
            if (tmp[1].charAt(0) === "^") {
              state.hmdLinkType = LinkType.FOOTREF
            } else {
              state.hmdLinkType = LinkType.BARELINK
            }
          } else if (tmp[2] === ":") { // footnote
            state.hmdLinkType = LinkType.FOOTNOTE
          } else {
            state.hmdLinkType = LinkType.NORMAL
          }
        } else {
          // leaving a link
          if (state.hmdLinkType in linkStyle) ans += " " + linkStyle[state.hmdLinkType]

          if (state.hmdLinkType === LinkType.FOOTNOTE) {
            state.hmdLinkType = LinkType.MAYBE_FOOTNOTE_URL
          } else {
            state.hmdLinkType = LinkType.NONE
          }
        }
      }

      if (state.hmdLinkType !== LinkType.NONE) {
        if (state.hmdLinkType in linkStyle) ans += " " + linkStyle[state.hmdLinkType]

        if (state.hmdLinkType === LinkType.MAYBE_FOOTNOTE_URL) {
          if (!/^(?:\]\:)?\s*$/.test(current)) { // not spaces
            if (urlRE.test(current) || url2RE.test(current)) ans += " hmd-footnote-url"
            else ans = ans.replace("string url", "")
            state.hmdLinkType = LinkType.NONE // since then, can't be url anymore
          }
        }
      }

      //#endregion

      //#region start of an escaped char
      if (/formatting-escape/.test(ans) && current.length > 1) {
        // CodeMirror merge backslash and escaped char into one token, which is not good
        // Use hmdOverride to separate them

        let escapedLength = current.length - 1
        let escapedCharStyle = ans.replace("formatting-escape", "escape") + " hmd-escape-char"
        state.hmdOverride = (stream, state) => { // one-time token() func
          stream.pos += escapedLength
          state.hmdOverride = null
          return escapedCharStyle.trim()
        }

        ans += " hmd-escape-backslash"
        stream.pos -= escapedLength
        return ans
      }
      //#endregion

      //#region [Table] Creating Table and style Table Separators


      if (!ans.trim() && modeCfg.table) {
        // string is unformatted

        let isTableSep = false

        if (current === " ") {
          // maybe is " " before "|"
          if (stream.match(/^\|\s?/)) isTableSep = true
        } else if (current === "|") {
          // is "|"
          stream.eat(" ") // maybe "| " ? try to eat a space
          isTableSep = true
        } else if (current.charAt(0) === "|") {
          // is "|xxxxxx", separate "|" and "xxxxxx"
          stream.pos = stream.start + 1 // rewind to end of "|"
          stream.eat(" ") // try to eat a space
          isTableSep = true
        } else if (tmp = current.match(/\s?\|/)) {
          // break unformatted "text|char" into "text" and "|char"
          stream.pos = stream.start + tmp.index // rewind
        }

        if (isTableSep) {
          // if not inside a table, try to construct one
          if (!tableType) {
            if (SimpleTableRE.test(stream.string) && SimpleTableSepRE.test(stream.lookAhead(1))) tableType = TableType.SIMPLE
            else if (NormalTableRE.test(stream.string) && NormalTableSepRE.test(stream.lookAhead(1))) tableType = TableType.NORMAL

            if (state.hmdTable = tableType) {
              // successfully made one
              state.hmdTableID = "T" + stream.lineOracle.line
              state.hmdTableRow = state.hmdTableCol = 0
            }
          }

          // then
          if (tableType) {
            const row = state.hmdTableRow
            const col = state.hmdTableCol++
            if (col == 0) ans += ` line-HyperMD-table_${state.hmdTableID} line-HyperMD-table-${tableType} line-HyperMD-table-row line-HyperMD-table-row-${row}`
            ans += ` hmd-table-sep hmd-table-sep-${col}`

            if (tableType === TableType.NORMAL && (firstTokenOfLine || stream.match(/^\s*$/, false))) {
              // Normal style table has extra `|` at the start / end of lines
              ans += ` hmd-table-sep-dummy`
            }
          }
        }
      }
      //#endregion
    }

    return ans.trim() || null
  }

  function modeOverride(stream: CodeMirror.StringStream, state: HyperMDState): string {
    const spos = stream.pos
    const willExit = stream.match(state.hmdInnerExitTag, false)
    const extraStyle = state.hmdInnerStyle

    let ans = state.hmdInnerMode.token(stream, state.hmdInnerState)

    if (extraStyle) {
      if (ans) ans += " " + extraStyle
      else ans = extraStyle
    }

    if (willExit) {
      const exitStyle = state.hmdInnerExitStyle
      if (exitStyle) {
        if (ans) ans += " " + exitStyle
        else ans = exitStyle
      }

      stream.pos = spos + state.hmdInnerExitTag.length
      state.hmdInnerExitStyle = null
      state.hmdInnerExitTag = null
      state.hmdInnerMode = null
      state.hmdInnerState = null
      state.hmdOverride = null
    }
    return ans
  }

  /** switch to another mode */
  function enterMode(stream: CodeMirror.StringStream, state: HyperMDState, modeName: string, endTag: string): string {
    var mode = CM.getMode(cmCfg, modeName)

    if (!mode || mode["name"] === "null") {
      // mode not loaded, create a dummy mode
      stream.pos += endTag.length // skip beginning chars
      const charSkipper = RegExp(`^(?:\\.|[\\${endTag.charAt(0)}]+)+`)
      mode = {
        token(stream, state) {
          stream.match(charSkipper) || stream.next()
          return null
        }
      }
    }

    state.hmdInnerExitTag = endTag
    state.hmdInnerMode = mode
    state.hmdOverride = modeOverride
    return mode.token(stream, state.hmdInnerState = CM.startState(mode))
  }

  return newMode
}, "hypermd")

CM.defineMIME("text/x-hypermd", "hypermd")
