// CodeMirror, copyright (c) by laobubu
// Distributed under an MIT license: http://codemirror.net/LICENSE
//
// This is a patch to markdown mode. Supports lots of new features
//

import * as CodeMirror from "codemirror"
import "codemirror/mode/markdown/markdown"

import "./hypermd.css"

/**
 * Markdown Extension Tokens
 *
 * - `$` Maybe a LaTeX
 * - `|` Maybe a Table Col Separator
 */
const tokenBreakRE = /[^\\][$|]/

const listRE = /^(?:[*\-+]|^[0-9]+([.)]))\s+/
const urlRE = /^((?:(?:aaas?|about|acap|adiumxtra|af[ps]|aim|apt|attachment|aw|beshare|bitcoin|bolo|callto|cap|chrome(?:-extension)?|cid|coap|com-eventbrite-attendee|content|crid|cvs|data|dav|dict|dlna-(?:playcontainer|playsingle)|dns|doi|dtn|dvb|ed2k|facetime|feed|file|finger|fish|ftp|geo|gg|git|gizmoproject|go|gopher|gtalk|h323|hcp|https?|iax|icap|icon|im|imap|info|ipn|ipp|irc[6s]?|iris(?:\.beep|\.lwz|\.xpc|\.xpcs)?|itms|jar|javascript|jms|keyparc|lastfm|ldaps?|magnet|mailto|maps|market|message|mid|mms|ms-help|msnim|msrps?|mtqp|mumble|mupdate|mvn|news|nfs|nih?|nntp|notes|oid|opaquelocktoken|palm|paparazzi|platform|pop|pres|proxy|psyc|query|res(?:ource)?|rmi|rsync|rtmp|rtsp|secondlife|service|session|sftp|sgn|shttp|sieve|sips?|skype|sm[bs]|snmp|soap\.beeps?|soldat|spotify|ssh|steam|svn|tag|teamspeak|tel(?:net)?|tftp|things|thismessage|tip|tn3270|tv|udp|unreal|urn|ut2004|vemmi|ventrilo|view-source|webcal|wss?|wtai|wyciwyg|xcon(?:-userid)?|xfire|xmlrpc\.beeps?|xmpp|xri|ymsgr|z39\.50[rs]?):(?:\/{1,3}|[a-z0-9%])|www\d{0,3}[.]|[a-z0-9.\-]+[.][a-z]{2,4}\/)(?:[^\s()<>]|\([^\s()<>]*\))+(?:\([^\s()<>]*\)|[^\s`*!()\[\]{};:'".,<>?«»“”‘’]))/i // from CodeMirror/mode/gfm
const emailRE = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
const url2RE = /^\.{0,2}\/[^\>\s]+/
const hashtagRE = /^(?:[-()/a-zA-Z0-9ァ-ヺー-ヾｦ-ﾟｰ０-９Ａ-Ｚａ-ｚぁ-ゖ゙-ゞー々ぁ-んァ-ヾ一-\u9FEF㐀-䶵﨎﨏﨑﨓﨔﨟﨡﨣﨤﨧-﨩]|[\ud840-\ud868][\udc00-\udfff]|\ud869[\udc00-\uded6\udf00-\udfff]|[\ud86a-\ud86c][\udc00-\udfff]|\ud86d[\udc00-\udf34\udf40-\udfff]|\ud86e[\udc00-\udc1d])+/

export type TokenFunc = (stream: CodeMirror.StringStream, state: HyperMDState) => string

export interface MarkdownStateLine {
  stream: CodeMirror.StringStream,
  header?: boolean
  hr?: boolean
  fencedCodeEnd?: boolean
}

export interface MarkdownState {
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

  // hidden state
  image?: boolean,
  imageMarker?: boolean,
  imageAltText?: boolean,

  /** -1 means code-block and +1,2,3... means ``inline ` quoted codes`` */
  code: false | number,
  em: false | string,
  strong: false | string,
  header: number,
  setext: 0 | 1 | 2, // current line is afxHeader before ---- ======
  hr: boolean,
  taskList: boolean,
  list: true | null | false, // true: bullet, null: list text, false: not a list
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

export type InnerModeExitChecker = (stream: CodeMirror.StringStream, state: HyperMDState) => {
  endPos?: number
  skipInnerMode?: boolean
  style?: string
}

export interface HyperMDState extends MarkdownState {
  hmdTable: TableType
  hmdTableID: string
  hmdTableColumns: string[]
  hmdTableCol: number
  hmdTableRow: number
  hmdOverride: TokenFunc

  hmdHashtag: HashtagType

  hmdInnerStyle: string
  hmdInnerExitChecker: InnerModeExitChecker
  hmdInnerMode: CodeMirror.Mode<any>
  hmdInnerState: any

  hmdLinkType: LinkType
  hmdNextMaybe: NextMaybe

  hmdNextState: HyperMDState
  hmdNextStyle: string
  hmdNextPos: number
}

export const enum HashtagType {
  NONE = 0,
  NORMAL, // hashtag text with no unescaped spaces
  WITH_SPACE, // hashtag text
}

export const enum TableType {
  NONE = 0,
  SIMPLE,     //   table | column
  NORMAL,     // | table | column |
}

const SimpleTableRE = /^\s*[^\|].*?\|.*[^|]\s*$/
const SimpleTableLooseRE = /^\s*[^\|].*\|/ // unfinished | row
const NormalTableRE = /^\s*\|[^\|]+\|.+\|\s*$/
const NormalTableLooseRE = /^\s*\|/ // | unfinished row

export const enum NextMaybe {
  NONE = 0,
  FRONT_MATTER, // only appears once, for each Doc
  FRONT_MATTER_END, // endline of front_matter not reached
}

export const enum LinkType {
  NONE = 0,
  BARELINK,  // [link]
  FOOTREF,   // [^ref]
  NORMAL,    // [text](url) or [text][doc]
  FOOTNOTE,  // [footnote]:
  MAYBE_FOOTNOTE_URL, // things after colon
  BARELINK2, // [some-name][]  except latter []
  FOOTREF2,  // [text][doc]  the [doc] part
}

const linkStyle = {
  [LinkType.BARELINK]: "hmd-barelink",
  [LinkType.BARELINK2]: "hmd-barelink2",
  [LinkType.FOOTREF]: "hmd-barelink hmd-footref",
  [LinkType.FOOTNOTE]: "hmd-footnote line-HyperMD-footnote",
  [LinkType.FOOTREF2]: "hmd-footref2",
}

function resetTable(state: HyperMDState) {
  state.hmdTable = TableType.NONE
  state.hmdTableColumns = []
  state.hmdTableID = null
  state.hmdTableCol = state.hmdTableRow = 0
}

const listInQuoteRE = /^\s+((\d+[).]|[-*+])\s+)?/;

const defaultTokenTypeOverrides = {
  hr: "line-HyperMD-hr line-background-HyperMD-hr-bg hr",
  // HyperMD needs to know the level of header/indent. using tokenTypeOverrides is not enough
  // header: "line-HyperMD-header header",
  // quote: "line-HyperMD-quote quote",
  // Note: there are some list related process below
  list1: "list-1",
  list2: "list-2",
  list3: "list-3",
  code: "inline-code",
  hashtag: "hashtag meta",
}

CodeMirror.defineMode("hypermd", function (cmCfg, modeCfgUser) {
  var modeCfg = {
    front_matter: true,
    math: true,
    table: true,
    toc: true, // support [TOC] and [TOCM]
    orgModeMarkup: true, // support OrgMode-like Markup like #+TITLE: my document
    hashtag: false, // support #hashtag

    fencedCodeBlockHighlighting: true,
    name: "markdown",
    highlightFormatting: true,
    taskLists: true,
    strikethrough: true,
    emoji: true,

    /** @see defaultTokenTypeOverrides */
    tokenTypeOverrides: defaultTokenTypeOverrides as Record<string, string>,
  }
  Object.assign(modeCfg, modeCfgUser)
  if (modeCfg.tokenTypeOverrides !== defaultTokenTypeOverrides) {
    modeCfg.tokenTypeOverrides = Object.assign({}, defaultTokenTypeOverrides, modeCfg.tokenTypeOverrides) as Record<string, string>
  }
  modeCfg["name"] = "markdown"

  /** functions from CodeMirror Markdown mode closure. Only for status checking */
  var rawClosure = {
    htmlBlock: null,
  }

  var rawMode: CodeMirror.Mode<MarkdownState> = CodeMirror.getMode(cmCfg, modeCfg)
  var newMode: CodeMirror.Mode<HyperMDState> = { ...rawMode } as any

  newMode.startState = function () {
    var ans = rawMode.startState() as HyperMDState
    resetTable(ans)
    ans.hmdOverride = null
    ans.hmdInnerExitChecker = null
    ans.hmdInnerMode = null
    ans.hmdLinkType = LinkType.NONE
    ans.hmdNextMaybe = modeCfg.front_matter ? NextMaybe.FRONT_MATTER : NextMaybe.NONE
    ans.hmdNextState = null
    ans.hmdNextStyle = null
    ans.hmdNextPos = null
    ans.hmdHashtag = HashtagType.NONE
    return ans
  }

  newMode.copyState = function (s) {
    var ans = rawMode.copyState(s) as HyperMDState
    const keys: (keyof HyperMDState)[] = [
      "hmdLinkType", "hmdNextMaybe",
      "hmdTable", "hmdTableID", "hmdTableCol", "hmdTableRow",
      "hmdOverride",
      "hmdInnerMode", "hmdInnerStyle", "hmdInnerExitChecker",
      "hmdNextPos", "hmdNextState", "hmdNextStyle",
      "hmdHashtag",
    ]
    for (const key of keys) ans[key] = s[key]

    ans.hmdTableColumns = s.hmdTableColumns.slice(0)

    if (s.hmdInnerMode) ans.hmdInnerState = CodeMirror.copyState(s.hmdInnerMode, s.hmdInnerState)

    return ans
  }

  newMode.blankLine = function (state) {
    var ans: string | void

    var innerMode = state.hmdInnerMode
    if (innerMode) {
      if (innerMode.blankLine) ans = innerMode.blankLine(state.hmdInnerState)
    } else {
      ans = rawMode.blankLine(state)
    }

    if (!ans) ans = ""

    if (state.code === -1) {
      ans += " line-HyperMD-codeblock line-background-HyperMD-codeblock-bg"
    }
    resetTable(state)
    return ans.trim() || null
  }

  newMode.indent = function (state, textAfter) {
    var mode = state.hmdInnerMode || rawMode
    var f = mode.indent

    if (typeof f === 'function') return f.apply(mode, arguments)
    return CodeMirror.Pass
  }

  newMode.innerMode = function (state) {
    if (state.hmdInnerMode) return { mode: state.hmdInnerMode, state: state.hmdInnerState }
    return rawMode.innerMode(state)
  }

  newMode.token = function (stream, state) {
    if (state.hmdOverride) return state.hmdOverride(stream, state)

    if (state.hmdNextMaybe === NextMaybe.FRONT_MATTER) { // Only appears once for each Doc
      if (stream.string === '---') {
        state.hmdNextMaybe = NextMaybe.FRONT_MATTER_END
        return enterMode(stream, state, "yaml", {
          style: "hmd-frontmatter",
          fallbackMode: () => createDummyMode("---"),
          exitChecker: function (stream, state) {
            if (stream.string === '---') {
              // found the endline of front_matter
              state.hmdNextMaybe = NextMaybe.NONE
              return { endPos: 3 }
            } else {
              return null
            }
          }
        })
      } else {
        state.hmdNextMaybe = NextMaybe.NONE
      }
    }

    const wasInHTML = (state.f === rawClosure.htmlBlock)
    const wasInCodeFence = state.code === -1
    const bol = stream.start === 0

    const wasLinkText = state.linkText
    const wasLinkHref = state.linkHref

    let inMarkdown = !(wasInCodeFence || wasInHTML)
    let inMarkdownInline = inMarkdown && !(state.code || state.indentedCode || state.linkHref)

    var ans = ""
    var tmp: RegExpMatchArray

    if (inMarkdown) {
      // now implement some extra features that require higher priority than CodeMirror's markdown

      //#region Math
      if (modeCfg.math && inMarkdownInline && (tmp = stream.match(/^\${1,2}/, false))) {
        let endTag = tmp[0]
        let mathLevel = endTag.length as (1 | 2)
        if (mathLevel === 2 || stream.string.slice(stream.pos).match(/[^\\]\$/)) {
          // $$ may span lines, $ must be paired
          let texMode = CodeMirror.getMode(cmCfg, {
            name: "stex",
          })
          let noTexMode = texMode['name'] !== 'stex';
          ans += enterMode(stream, state, texMode, {
            style: "math",
            skipFirstToken: noTexMode, // if stex mode exists, current token is valid in stex
            fallbackMode: () => createDummyMode(endTag),
            exitChecker: createSimpleInnerModeExitChecker(endTag, {
              style: "formatting formatting-math formatting-math-end math-" + mathLevel
            })
          })
          if (noTexMode) stream.pos += tmp[0].length
          ans += " formatting formatting-math formatting-math-begin math-" + mathLevel
          return ans
        }
      }
      //#endregion

      //#region [OrgMode] markup
      if (bol && modeCfg.orgModeMarkup && (tmp = stream.match(/^\#\+(\w+\:?)\s*/))) {
        // Support #+TITLE: This is the title of the document

        if (!stream.eol()) {
          state.hmdOverride = (stream, state) => {
            stream.skipToEnd()
            state.hmdOverride = null
            return "string hmd-orgmode-markup"
          }
        }

        return "meta formatting-hmd-orgmode-markup hmd-orgmode-markup line-HyperMD-orgmode-markup"
      }
      //#endregion

      //#region [TOC] in a single line
      if (bol && modeCfg.toc && stream.match(/^\[TOCM?\]\s*$/i)) {
        return "meta line-HyperMD-toc hmd-toc"
      }
      //#endregion

      //#region Extra markdown inline extenson
      if (inMarkdownInline) {
        // transform unformatted URL into link
        if (!state.hmdLinkType && (stream.match(urlRE) || stream.match(emailRE))) {
          return "url"
        }
      }
      //#endregion
    }

    // now enter markdown

    if (state.hmdNextState) {
      stream.pos = state.hmdNextPos
      ans += " " + (state.hmdNextStyle || "")
      Object.assign(state, state.hmdNextState)
      state.hmdNextState = null
      state.hmdNextStyle = null
      state.hmdNextPos = null
    } else {
      ans += " " + (rawMode.token(stream, state) || "")
    }

    // add extra styles
    if (state.hmdHashtag !== HashtagType.NONE) {
      ans += " " + modeCfg.tokenTypeOverrides.hashtag
    }

    /** Try to capture some internal functions from CodeMirror Markdown mode closure! */
    if (!rawClosure.htmlBlock && state.htmlState) rawClosure.htmlBlock = state.f;

    const inHTML = (state.f === rawClosure.htmlBlock)
    const inCodeFence = state.code === -1
    inMarkdown = inMarkdown && !(inHTML || inCodeFence)
    inMarkdownInline = inMarkdownInline && inMarkdown && !(state.code || state.indentedCode || state.linkHref)

    // If find a markdown extension token (which is not escaped),
    // break current parsed string into two parts and the first char of next part is the markdown extension token
    if (inMarkdownInline && (tmp = stream.current().match(tokenBreakRE))) {
      stream.pos = stream.start + tmp.index + 1 // rewind
    }
    var current = stream.current()

    if (inHTML != wasInHTML) {
      if (inHTML) {
        ans += " hmd-html-begin"
        rawClosure.htmlBlock = state.f
      } else {
        ans += " hmd-html-end"
      }
    }

    if (wasInCodeFence || inCodeFence) {
      if (!state.localMode || !wasInCodeFence) ans = ans.replace("inline-code", "")
      ans += " line-HyperMD-codeblock line-background-HyperMD-codeblock-bg"
      if (inCodeFence !== wasInCodeFence) {
        if (!inCodeFence) ans += " line-HyperMD-codeblock-end line-background-HyperMD-codeblock-end-bg"
        else if (!wasInCodeFence) ans += " line-HyperMD-codeblock-begin line-background-HyperMD-codeblock-begin-bg"
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
          resetTable(state)
        }
      }
      //#endregion

      //#region Header, indentedCode, quote

      if (bol && state.header) {
        if (/^(?:---+|===+)\s*$/.test(stream.string) && state.prevLine && state.prevLine.header) {
          ans += " line-HyperMD-header-line line-HyperMD-header-line-" + state.header
        } else {
          ans += " line-HyperMD-header line-HyperMD-header-" + state.header
        }
      }

      if (state.indentedCode) {
        ans += " hmd-indented-code"
      }

      if (state.quote) {
        // mess up as less as possible
        if (stream.eol()) {
          ans += " line-HyperMD-quote line-HyperMD-quote-" + state.quote
          if (!/^ {0,3}\>/.test(stream.string)) ans += " line-HyperMD-quote-lazy" // ">" is omitted
        }

        if (bol && (tmp = current.match(/^\s+/))) {
          stream.pos = tmp[0].length // rewind
          ans += " hmd-indent-in-quote"
          return ans.trim()
        }

        // make indentation (and potential list bullet) monospaced
        if (/^>\s+$/.test(current) && stream.peek() != ">") {
          stream.pos = stream.start + 1 // rewind!
          current = ">"
          state.hmdOverride = (stream, state) => {
            stream.match(listInQuoteRE)
            state.hmdOverride = null
            return "hmd-indent-in-quote line-HyperMD-quote line-HyperMD-quote-" + state.quote
          }
        }
      }

      //#endregion

      //#region List

      let maxNonCodeIndentation = (state.listStack[state.listStack.length - 1] || 0) + 3
      let tokenIsIndent = bol && /^\s+$/.test(current) && (state.list !== false || stream.indentation() <= maxNonCodeIndentation)
      let tokenIsListBullet = state.list && /formatting-list/.test(ans)

      if (tokenIsListBullet || (tokenIsIndent && (state.list !== false || stream.match(listRE, false)))) {
        let listLevel = state.listStack && state.listStack.length || 0
        if (tokenIsIndent) {
          if (stream.match(listRE, false)) { // next token is 1. 2. or bullet
            if (state.list === false) listLevel++
          } else {
            while (listLevel > 0 && stream.pos < state.listStack[listLevel - 1]) {
              listLevel-- // find the real indent level
            }
            if (!listLevel) { // not even a list
              return ans.trim() || null
            }
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
          tmp = stream.match(/^([^\]]+)\](\(| ?\[|\:)?/, false)
          if (!tmp) { // maybe met a line-break in link text?
            state.hmdLinkType = LinkType.BARELINK
          } else if (!tmp[2]) { // barelink
            if (tmp[1].charAt(0) === "^") {
              state.hmdLinkType = LinkType.FOOTREF
            } else {
              state.hmdLinkType = LinkType.BARELINK
            }
          } else if (tmp[2] === ":") { // footnote
            state.hmdLinkType = LinkType.FOOTNOTE
          } else if ((tmp[2] === "[" || tmp[2] === " [") && stream.string.charAt(stream.pos + tmp[0].length) === "]") { // [barelink2][]
            state.hmdLinkType = LinkType.BARELINK2
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

      if (wasLinkHref !== state.linkHref) {
        if (!wasLinkHref) {
          // [link][doc] the [doc] part
          if (current === "[" && stream.peek() !== "]") {
            state.hmdLinkType = LinkType.FOOTREF2
          }
        } else if (state.hmdLinkType) { // leaving a Href
          ans += " " + linkStyle[state.hmdLinkType]
          state.hmdLinkType = LinkType.NONE
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

        if (current.charAt(0) === "|") {
          // is "|xxxxxx", separate "|" and "xxxxxx"
          stream.pos = stream.start + 1 // rewind to end of "|"
          current = "|"
          isTableSep = true
        }

        if (isTableSep) {
          // if not inside a table, try to construct one
          if (!tableType) {
            // check 1: current line meet the table format
            if (SimpleTableRE.test(stream.string)) tableType = TableType.SIMPLE
            else if (NormalTableRE.test(stream.string)) tableType = TableType.NORMAL

            // check 2: check every column's alignment style
            let rowStyles: string[]
            if (tableType) {
              let nextLine = stream.lookAhead(1)

              if (tableType === TableType.NORMAL) {
                if (!NormalTableRE.test(nextLine)) {
                  tableType = TableType.NONE
                } else {
                  // remove leading / tailing pipe char
                  nextLine = nextLine.replace(/^\s*\|/, '').replace(/\|\s*$/, '')
                }
              } else if (tableType === TableType.SIMPLE) {
                if (!SimpleTableRE.test(nextLine)) {
                  tableType = TableType.NONE
                }
              }

              if (tableType) {
                rowStyles = nextLine.split("|")
                for (let i = 0; i < rowStyles.length; i++) {
                  let row = rowStyles[i]

                  if (/^\s*--+\s*:\s*$/.test(row)) row = "right"
                  else if (/^\s*:\s*--+\s*$/.test(row)) row = "left"
                  else if (/^\s*:\s*--+\s*:\s*$/.test(row)) row = "center"
                  else if (/^\s*--+\s*$/.test(row)) row = "default"
                  else {
                    // ouch, can't be a table
                    tableType = TableType.NONE
                    break
                  }

                  rowStyles[i] = row
                }
              }
            }

            // step 3: made it
            if (tableType) {
              // successfully made one
              state.hmdTable = tableType
              state.hmdTableColumns = rowStyles
              state.hmdTableID = "T" + stream.lineOracle.line
              state.hmdTableRow = state.hmdTableCol = 0
            }
          }

          // then
          if (tableType) {
            const colUbound = state.hmdTableColumns.length - 1
            if (tableType === TableType.NORMAL && ((state.hmdTableCol === 0 && /^\s*\|$/.test(stream.string.slice(0, stream.pos))) || stream.match(/^\s*$/, false))) {
              ans += ` hmd-table-sep hmd-table-sep-dummy`
            } else if (state.hmdTableCol < colUbound) {
              const row = state.hmdTableRow
              const col = state.hmdTableCol++
              if (col == 0) {
                ans += ` line-HyperMD-table_${state.hmdTableID} line-HyperMD-table-${tableType} line-HyperMD-table-row line-HyperMD-table-row-${row}`
              }
              ans += ` hmd-table-sep hmd-table-sep-${col}`
            }
          }
        }
      }
      //#endregion

      if (tableType && state.hmdTableRow === 1) {
        // fix a stupid problem:    :------: is not emoji
        if (/emoji/.test(ans)) ans = ""
      }

      //#region HTML Block
      //
      // See https://github.github.com/gfm/#html-blocks type3-5

      if (inMarkdownInline && current === '<') {
        let endTag: string = null
        if (stream.match(/^\![A-Z]+/)) endTag = ">"
        else if (stream.match("?")) endTag = "?>"
        else if (stream.match("![CDATA[")) endTag = "]]>"

        if (endTag != null) {
          return enterMode(stream, state, null, {
            endTag,
            style: (ans + " comment hmd-cdata-html").trim(),
          })
        }
      }

      //#endregion

      //#region Hashtag
      if (modeCfg.hashtag && inMarkdownInline) {
        switch (state.hmdHashtag) {
          case HashtagType.NONE:
            if (
              current === '#' &&
              !state.linkText && !state.image &&
              (bol || /^\s*$/.test(stream.string.charAt(stream.start - 1)))
            ) {
              let escape_removed_str = stream.string.slice(stream.pos).replace(/\\./g, '')

              if (
                (tmp = hashtagRE.exec(escape_removed_str))
              ) {
                if (/^\d+$/.test(tmp[0])) state.hmdHashtag = HashtagType.NONE
                else state.hmdHashtag = HashtagType.NORMAL

                escape_removed_str = escape_removed_str.slice(tmp[0].length)
                do {
                  // found tailing #
                  if (
                    escape_removed_str[0] === '#' &&
                    (escape_removed_str.length === 1 || !hashtagRE.test(escape_removed_str[1]))
                  ) {
                    state.hmdHashtag = HashtagType.WITH_SPACE
                    break
                  }
                  if (tmp = escape_removed_str.match(/^\s+/)) {
                    escape_removed_str = escape_removed_str.slice(tmp[0].length)
                    if (tmp = escape_removed_str.match(hashtagRE)) {
                      // found a space + valid tag text parts
                      // continue this loop until tailing # is found
                      escape_removed_str = escape_removed_str.slice(tmp[0].length)
                      continue
                    }
                  }
                  // can't establish a Hashtag WITH_SPACE. stop
                  break
                } while (true);
              }

              if (state.hmdHashtag) {
                ans += " formatting formatting-hashtag hashtag-begin " + modeCfg.tokenTypeOverrides.hashtag
              }
            }
            break;
          case HashtagType.NORMAL:
            let endHashTag = false

            if (!/formatting/.test(ans) && !/^\s*$/.test(current)) {
              // if invalid hashtag char found, break current parsed text part
              tmp = current.match(hashtagRE)
              let backUpChars = current.length - (tmp ? tmp[0].length : 0)
              if (backUpChars > 0) {
                stream.backUp(backUpChars)
                endHashTag = true
              }
            }

            if (!endHashTag) endHashTag = stream.eol() // end of line
            if (!endHashTag) endHashTag = !hashtagRE.test(stream.peek()) // or next char is invalid to hashtag name
            // escaped char is always invisible to stream. no worry

            if (endHashTag) {
              ans += " hashtag-end"
              state.hmdHashtag = HashtagType.NONE
            }
            break;
          case HashtagType.WITH_SPACE:
            // escaped char is always invisible to stream. no worry
            if (current === '#') {
              // end the hashtag if meet unescaped #
              ans = ans.replace(/\sformatting-header(?:-\d+)?/g, '')
              ans += " formatting formatting-hashtag hashtag-end"
              state.hmdHashtag = HashtagType.NONE
            }
            break;
        }
      }
      //#endregion
    }

    return ans.trim() || null
  }

  function modeOverride(stream: CodeMirror.StringStream, state: HyperMDState): string {
    const exit = state.hmdInnerExitChecker(stream, state)
    const extraStyle = state.hmdInnerStyle

    let ans = (!exit || !exit.skipInnerMode) && state.hmdInnerMode.token(stream, state.hmdInnerState) || ""

    if (extraStyle) ans += " " + extraStyle
    if (exit) {
      if (exit.style) ans += " " + exit.style
      if (exit.endPos) stream.pos = exit.endPos

      state.hmdInnerExitChecker = null
      state.hmdInnerMode = null
      state.hmdInnerState = null
      state.hmdOverride = null
    }

    return ans.trim() || null
  }

  /**
   * advance Markdown tokenizing stream
   *
   * @returns true if success, then `state.hmdNextState` & `state.hmdNextStyle` will be set
   */
  function advanceMarkdown(stream: CodeMirror.StringStream, state: HyperMDState) {
    if (stream.eol() || state.hmdNextState) return false

    var oldStart = stream.start
    var oldPos = stream.pos

    stream.start = oldPos
    var newState = { ...state }
    var newStyle = rawMode.token(stream, newState)

    state.hmdNextPos = stream.pos
    state.hmdNextState = newState
    state.hmdNextStyle = newStyle

    // console.log("ADVANCED!", oldStart, oldPos, stream.start, stream.pos)
    // console.log("ADV", newStyle, newState)

    stream.start = oldStart
    stream.pos = oldPos

    return true
  }

  function createDummyMode(endTag: string): CodeMirror.Mode<void> {
    return {
      token(stream) {
        var endTagSince = stream.string.indexOf(endTag, stream.start)
        if (endTagSince === -1) stream.skipToEnd() // endTag not in this line
        else if (endTagSince === 0) stream.pos += endTag.length // current token is endTag
        else {
          stream.pos = endTagSince
          if (stream.string.charAt(endTagSince - 1) === "\\") stream.pos++
        }

        return null
      }
    }
  }

  function createSimpleInnerModeExitChecker(endTag: string, retInfo?: ReturnType<InnerModeExitChecker>): InnerModeExitChecker {
    if (!retInfo) retInfo = {}

    return function (stream, state) {
      if (stream.string.substr(stream.start, endTag.length) === endTag) {
        retInfo.endPos = stream.start + endTag.length
        return retInfo
      }
      return null
    }
  }

  interface BasicInnerModeOptions {
    skipFirstToken?: boolean
    style?: string
  }

  interface InnerModeOptions1 extends BasicInnerModeOptions {
    fallbackMode: () => CodeMirror.Mode<any>
    exitChecker: InnerModeExitChecker
  }

  interface InnerModeOptions2 extends BasicInnerModeOptions {
    endTag: string
  }

  type InnerModeOptions = InnerModeOptions1 | InnerModeOptions2

  /**
   * switch to another mode
   *
   * After entering a mode, you can then set `hmdInnerExitStyle` and `hmdInnerState` of `state`
   *
   * @returns if `skipFirstToken` not set, returns `innerMode.token(stream, innerState)`, meanwhile, stream advances
   */
  function enterMode(stream: CodeMirror.StringStream, state: HyperMDState, mode: string | CodeMirror.Mode<any>, opt: InnerModeOptions): string {
    if (typeof mode === "string") mode = CodeMirror.getMode(cmCfg, mode)

    if (!mode || mode["name"] === "null") {
      if ('endTag' in opt) mode = createDummyMode(opt.endTag)
      else mode = (typeof opt.fallbackMode === 'function') && opt.fallbackMode()

      if (!mode) throw new Error("no mode")
    }

    state.hmdInnerExitChecker = ('endTag' in opt) ? createSimpleInnerModeExitChecker(opt.endTag) : opt.exitChecker
    state.hmdInnerStyle = opt.style
    state.hmdInnerMode = mode
    state.hmdOverride = modeOverride
    state.hmdInnerState = CodeMirror.startState(mode)

    var ans = opt.style || ""
    if (!opt.skipFirstToken) {
      ans += " " + mode.token(stream, state.hmdInnerState)
    }
    return ans.trim()
  }

  return newMode
}, "hypermd")

CodeMirror.defineMIME("text/x-hypermd", "hypermd")
