// CodeMirror, copyright (c) by laobubu
// Distributed under an MIT license: http://codemirror.net/LICENSE
//
// This is a patch to markdown mode. Supports lots of new features
//

import CM from "codemirror"
import { assign } from "../core";
import "codemirror/mode/markdown/markdown"
import "codemirror/mode/stex/stex"

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
  hmdTable: string // Table ID
  hmdOverride: TokenFunc
  hmdInnerStyle: string
  hmdInnerExitStyle: string
  hmdInnerExitTag: string

  hmdInnerMode: CodeMirror.Mode<any>
  hmdInnerState: any
}


CM.defineMode("hypermd", function (cmCfg, modeCfgUser) {
  var modeCfg = {
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
    ans.hmdTable = null
    ans.hmdOverride = null
    ans.hmdInnerExitTag = null
    ans.hmdInnerExitStyle = null
    ans.hmdInnerMode = null
    return ans
  }

  newMode.copyState = function (s) {
    var ans = rawMode.copyState(s) as HyperMDState
    const keys: (keyof HyperMDState)[] = [
      "hmdTable", "hmdOverride",
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
    return ans || null
  }

  newMode.token = function (stream, state) {
    if (state.hmdOverride) return state.hmdOverride(stream, state)

    const wasInCodeFence = state.code === -1
    const firstTokenOnLine = stream.column() === state.indentation

    var ans = ""
    var tmp: RegExpMatchArray

    if (!state.code && (tmp = stream.match(/^\${1,2}/, false))) {
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

    // now enter markdown

    ans += " " + (rawMode.token(stream, state) || "")

    if (firstTokenOnLine && state.header > 0) {
      if (!state.prevLine.header) {
        ans += " line-HyperMD-header line-HyperMD-header-" + state.header
      } else {
        ans += " line-HyperMD-header-line line-HyperMD-header-line-" + state.header
      }
    }

    if (state.indentedCode) {
      ans += " hmd-indented-code"
    }

    if (state.quote && stream.current().charAt(0) !== ">") {
      ans += " line-HyperMD-quote line-HyperMD-quote-" + state.quote
    }

    const inCodeFence = state.code === -1
    if (firstTokenOnLine && (wasInCodeFence || inCodeFence)) {
      ans += " line-HyperMD-codeblock line-background-HyperMD-codeblock-bg"
      if (!inCodeFence) ans += " line-HyperMD-codeblock-end"
      else if (!wasInCodeFence) ans += " line-HyperMD-codeblock-begin"
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
