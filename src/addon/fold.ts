// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
//
// DESCRIPTION: Turn Markdown markers into real images, link icons etc. Support custom folders.
//
// You may set `hmdFold.customFolders` option to fold more, where `customFolders` is Array<FolderFunc>
//

import * as CodeMirror from 'codemirror'
import { Addon, FlipFlop, debounce, TokenSeeker, suggestedEditorConfig, normalVisualConfig } from '../core'
import { TextMarker, Position, Token } from 'codemirror'
import { cm_t } from '../core/type'
import { splitLink } from './read-link'

const DEBUG = false

export interface TextMarkerEx extends CodeMirror.TextMarker {
  _hmd_fold_type?: string
}

/********************************************************************************** */
//#region FolderFunc & FoldStream declaration

/**
 * 1. Check if `token` is a **BEGINNING TOKEN** of fold-able text (eg. "!" for images)
 * 2. Use `stream.findNext` to find the end of the text to be folded (eg. ")" or "]" of link/URL, for images)
 * 3. Compose a range `{from, to}`
 *    - `from` is always `{ line: stream.lineNo, ch: token.start }`
 * 4. Check if `stream.requestRange(from, to)` returns `RequestRangeResult.OK`
 *    - if not ok, return `null` immediately.
 * 5. Use `stream.cm.markText(from, to, options)` to fold text, and return the marker
 *
 * @param token current checking token. a shortcut to `stream.lineTokens[stream.i_token]`
 * @returns a TextMarker if folded.
 */
export type FolderFunc = (stream: FoldStream, token: CodeMirror.Token) => CodeMirror.TextMarker;

/** FolderFunc may use FoldStream to lookup for tokens */
export interface FoldStream {
  readonly cm: cm_t

  readonly line: CodeMirror.LineHandle
  readonly lineNo: number
  readonly lineTokens: Token[]    // always same as cm.getLineTokens(line)
  readonly i_token: number        // current token's index
  /**
   * Find next Token that matches the condition AFTER current token (whose index is `i_token`), or a given position
   * This function will NOT make the stream precede!
   *
   * @param condition a RegExp to check token.type, or a function check the Token
   * @param maySpanLines by default the searching will not span lines
   */
  findNext(condition: RegExp | ((token: Token) => boolean), maySpanLines?: boolean, since?: Position): { lineNo: number, token: Token, i_token: number }

  /**
   * In current line, find next Token that matches the condition SINCE the token with given index
   * This function will NOT make the stream precede!
   *
   * @param condition a RegExp to check token.type, or a function check the Token
   * @param i_token_since default: i_token+1 (the next of current token)
   */
  findNext(condition: RegExp | ((token: Token) => boolean), i_token_since: number): { lineNo: number, token: Token, i_token: number }

  /**
   * Before creating a TextMarker, check if the range is good to use.
   *
   * Do NOT create TextMarker unless this returns `RequestRangeResult.OK`
   */
  requestRange(from: Position, to: Position): RequestRangeResult
}

export enum RequestRangeResult {
  // Use string values because in TypeScript, string enum members do not get a reverse mapping generated at all.
  // Otherwise the generated code looks ugly
  OK = "ok",
  CURSOR_INSIDE = "ci",
  HAS_MARKERS = "hm",
}

//#endregion

/********************************************************************************** */
//#region FolderFunc Registry

export var folderRegistry: Record<string, FolderFunc> = {}

/**
 * Add a Folder to the System Folder Registry
 *
 * @param name eg. "math"  "html"  "image"  "link"
 * @param folder
 * @param suggested enable this folder in suggestedEditorConfig
 * @param force if a folder with same name is already exists, overwrite it. (dangerous)
 */
export function registerFolder(name: string, folder: FolderFunc, suggested: boolean, force?: boolean) {
  var registry = folderRegistry

  if (name in registry && !force) throw new Error(`Folder ${name} already registered`)

  defaultOption[name] = false
  suggestedOption[name] = !!suggested
  registry[name] = folder
}

//#endregion

/********************************************************************************** */
//#region builtinFolder

export const ImageFolder: FolderFunc = function (stream, token) {
  const cm = stream.cm
  const imgRE = /\bimage-marker\b/
  const urlRE = /\bformatting-link-string\b/   // matches the parentheses
  if (imgRE.test(token.type) && token.string === "!") {
    var lineNo = stream.lineNo

    // find the begin and end of url part
    var url_begin = stream.findNext(urlRE)
    var url_end = stream.findNext(urlRE, url_begin.i_token + 1)

    let from: Position = { line: lineNo, ch: token.start }
    let to: Position = { line: lineNo, ch: url_end.token.end }
    let rngReq = stream.requestRange(from, to)

    if (rngReq === RequestRangeResult.OK) {
      var url: string
      var title: string

      { // extract the URL
        let rawurl = cm.getRange(    // get the URL or footnote name in the parentheses
          { line: lineNo, ch: url_begin.token.start + 1 },
          { line: lineNo, ch: url_end.token.start }
        )
        if (url_end.token.string === "]") {
          let tmp = cm.hmdReadLink(rawurl, lineNo)
          if (!tmp) return null // Yup! bad URL?!
          rawurl = tmp.content
        }
        url = splitLink(rawurl).url
        url = cm.hmdResolveURL(url)
      }

      { // extract the title
        title = cm.getRange(
          { line: lineNo, ch: from.ch + 2 },
          { line: lineNo, ch: url_begin.token.start - 1 }
        )
      }

      var img = document.createElement("img")
      var marker = cm.markText(
        from, to,
        {
          collapsed: true,
          replacedWith: img,
        }
      )

      img.addEventListener('load', () => {
        img.classList.remove("hmd-image-loading")
        marker.changed()
      }, false)
      img.addEventListener('error', () => {
        img.classList.remove("hmd-image-loading")
        img.classList.add("hmd-image-error")
        marker.changed()
      }, false)
      img.addEventListener('click', () => breakMark(cm, marker), false)

      img.className = "hmd-image hmd-image-loading"
      img.src = url
      img.title = title
      return marker
    } else {
      if (DEBUG) {
        console.log("[image]FAILED TO REQUEST RANGE: ", rngReq)
      }
    }
  }

  return null
}

export const LinkFolder: FolderFunc = function (stream, token) {
  const cm = stream.cm
  const urlRE = /\bformatting-link-string\b/   // matches the parentheses
  const endTest = (token: Token) => (urlRE.test(token.type) && token.string === ")")

  if (
    token.string === "(" && urlRE.test(token.type) && // is URL left parentheses
    (stream.i_token === 0 || !/\bimage/.test(stream.lineTokens[stream.i_token - 1].type)) // not a image URL
  ) {
    var lineNo = stream.lineNo

    var url_end = stream.findNext(endTest)

    let from: Position = { line: lineNo, ch: token.start }
    let to: Position = { line: lineNo, ch: url_end.token.end }
    let rngReq = stream.requestRange(from, to)

    if (rngReq === RequestRangeResult.OK) {
      var text = cm.getRange(from, to)
      var { url, title } = splitLink(text.substr(1, text.length - 2))

      var img = document.createElement("span")
      img.setAttribute("class", "hmd-link-icon")
      img.setAttribute("title", url + "\n" + title)
      img.setAttribute("data-url", url)

      var marker = cm.markText(
        from, to,
        {
          collapsed: true,
          replacedWith: img,
        }
      )

      img.addEventListener('click', () => breakMark(cm, marker), false)
      return marker
    } else {
      if (DEBUG) {
        console.log("[link]FAILED TO REQUEST RANGE: ", rngReq)
      }
    }
  }

  return null
}

//#endregion

/********************************************************************************** */
//#region Utils

/** break a TextMarker, move cursor to where marker is */
export function breakMark(cm: cm_t, marker: TextMarker, chOffset?: number) {
  cm.operation(function () {
    var pos = marker.find().from
    pos = { line: pos.line, ch: pos.ch + ~~chOffset }
    cm.setCursor(pos)
    cm.focus()
    marker.clear()
  })
}

//#endregion

/********************************************************************************** */
//#region Addon Options

export type Options = Record<string, boolean>

export const defaultOption: Options = {
  /* will be populated by registerFolder() */
}

export const suggestedOption: Options = {
  /* will be populated by registerFolder() */
}

export type OptionValueType = Options | boolean;

declare global {
  namespace HyperMD {
    interface EditorConfiguration {
      /**
       * Enable/disable registered folders, for current editor instance.
       *
       * `hmdFold` accepts:
       *
       * 1. `true` -- only enable suggested folders
       * 2. `false` -- disable all kinds of folders
       * 3. `{ [FolderType]: boolean }` -- enable / disable folders
       *    - Note: registered but not configured folder kinds will be disabled
       *
       * @example { image: true, link: true, math: true, html: false }
       */
      hmdFold?: OptionValueType
    }
  }
}

suggestedEditorConfig.hmdFold = suggestedOption
normalVisualConfig.hmdFold = false

CodeMirror.defineOption("hmdFold", defaultOption, function (cm: cm_t, newVal: OptionValueType) {

  ///// convert newVal's type to `Record<string, boolean>`, if it is not.

  if (!newVal || typeof newVal === "boolean") {
    newVal = newVal ? suggestedOption : defaultOption
  }

  if ('customFolders' in newVal) {
    console.error('[HyperMD][Fold] `customFolders` is removed. To use custom folders, `registerFolder` first.')
    delete newVal['customFolders']
  }

  ///// apply config
  var inst = getAddon(cm)
  for (const type in folderRegistry) {
    inst.setStatus(type, newVal[type])
  }
  // then, folding task will be queued by setStatus()

})

//#endregion

/********************************************************************************** */
//#region Addon Class

export class Fold extends TokenSeeker implements Addon.Addon, FoldStream {
  /**
   * stores Folder status for current editor
   * @private To enable/disable folders, use `setStatus()`
   */
  private _enabled: Record<string, boolean> = {}

  /** Folder's output goes here */
  public folded: Record<string, TextMarkerEx[]> = {};

  /** enable/disable one kind of folder, in current editor */
  setStatus(type: string, enabled: boolean) {
    if (!(type in folderRegistry)) return

    if (!this._enabled[type] !== !enabled) {
      this._enabled[type] = !!enabled

      if (enabled) this.startFold()
      else this.clear(type)
    }
  }

  constructor(public cm: cm_t) {
    super(cm)

    cm.on("changes", (cm, changes) => {
      var changedMarkers: TextMarkerEx[] = []

      for (const change of changes) {
        let markers = cm.findMarks(change.from, change.to) as TextMarkerEx[]
        for (const marker of markers) {
          if (marker._hmd_fold_type) changedMarkers.push(marker)
        }
      }

      for (const m of changedMarkers) {
        m.clear() // TODO: add "changed" handler for FolderFunc
      }

      this.startFold();
    })
    cm.on("cursorActivity", (cm) => {
      this.startQuickFold()
    })
  }

  ///////////////////////////////////////////////////////////////////////////////////////////
  /// BEGIN OF APIS THAT EXPOSED TO FolderFunc
  /// @see FoldStream

  /**
   * Check if a range is foldable and update _quickFoldHint
   *
   * NOTE: this function is always called after `_quickFoldHint` reset by `startFoldImmediately`
   */
  requestRange(from: Position, to: Position): RequestRangeResult {
    const cm = this.cm, cmpPos = CodeMirror.cmpPos
    var cursorPos = cm.getCursor()
    var markers = cm.findMarks(from, to)

    var ans: RequestRangeResult = RequestRangeResult.OK

    if (markers.length !== 0) ans = RequestRangeResult.HAS_MARKERS
    else if (cmpPos(cursorPos, from) >= 0 && cmpPos(cursorPos, to) <= 0) ans = RequestRangeResult.CURSOR_INSIDE

    if (ans !== RequestRangeResult.OK) this._quickFoldHint.push(from.line)

    return ans
  }


  /// END OF APIS THAT EXPOSED TO FolderFunc
  ///////////////////////////////////////////////////////////////////////////////////////////

  /**
   * Fold everything! (This is a debounced, and `this`-binded version)
   */
  startFold = debounce(this.startFoldImmediately.bind(this), 100)

  /**
   * Fold everything!
   *
   * @param toLine last line to fold. Inclusive
   */
  startFoldImmediately(fromLine?: number, toLine?: number) {
    const cm = this.cm

    fromLine = fromLine || cm.firstLine()
    toLine = (toLine || cm.lastLine()) + 1

    this._quickFoldHint = []
    this.setPos(fromLine, 0, true)

    cm.operation(() => cm.eachLine(fromLine, toLine, line => {
      var lineNo = line.lineNo()
      if (lineNo < this.lineNo) return // skip current line...
      else if (lineNo > this.lineNo) this.setPos(lineNo, 0) // hmmm... maybe last one is empty line

      var charMarked: boolean[] = new Array(line.text.length)
      {
        // populate charMarked array.
        // @see CodeMirror's findMarksAt
        let lineMarkers = line.markedSpans
        if (lineMarkers) {
          for (let i = 0; i < lineMarkers.length; ++i) {
            let span = lineMarkers[i]
            let spanFrom = span.from == null ? 0 : span.from
            let spanTo = span.to == null ? charMarked.length : span.to
            for (let j = spanFrom; j < spanTo; j++) charMarked[j] = true
          }
        }
      }

      const tokens = this.lineTokens

      while (this.i_token < tokens.length) {
        var token = tokens[this.i_token]
        var type: string
        var marker: TextMarkerEx = null

        var tokenFoldable: boolean = true
        {
          for (let i = token.start; i < token.end; i++) {
            if (charMarked[i]) {
              tokenFoldable = false
              break
            }
          }
        }

        if (tokenFoldable) {
          // try built-in folders
          for (type in folderRegistry) {
            if (!this._enabled[type]) continue
            if (marker = folderRegistry[type](this, token)) break
          }
        }

        if (!marker) {
          // this token not folded. check next
          this.i_token++
        } else {
          var { from, to } = marker.find();
          (this.folded[type] || (this.folded[type] = [])).push(marker)
          marker._hmd_fold_type = type;
          marker.on('clear', (from, to) => {
            var markers = this.folded[type]
            var idx: number
            if (markers && (idx = markers.indexOf(marker)) !== -1) markers.splice(idx, 1)
            this._quickFoldHint.push(from.line)
          })

          if (DEBUG) {
            console.log("[FOLD] New marker ", type, from, to, marker)
          }

          if (to.line !== lineNo) {
            this.setPos(to.line, to.ch)
            return // nothing left in this line
          } else {
            this.setPos(to.ch) // i_token will be updated by this.setPos()
          }
        }
      }
    }))
  }

  /** stores every affected lineNo */
  private _quickFoldHint: number[] = []

  /**
   * Start a quick fold: only process recent `requestRange`-failed ranges
   */
  startQuickFold() {
    var hint = this._quickFoldHint
    if (hint.length === 0) return

    var from = hint[0], to = from
    for (const lineNo of hint) {
      if (from > lineNo) from = lineNo
      if (to < lineNo) to = lineNo
    }

    this.startFold.stop()
    this.startFoldImmediately(from, to)
  }

  /**
   * Clear one type of folded TextMarkers
   *
   * @param type builtin folder type ("image", "link" etc) or custom fold type
   */
  clear(type: string) {
    this.startFold.stop()

    var folded = this.folded[type]
    if (!folded || !folded.length) return
    var marker: CodeMirror.TextMarker
    while (marker = folded.pop()) marker.clear()
  }

  /**
   * Clear all folding result
   */
  clearAll() {
    this.startFold.stop()

    for (const type in this.folded) {
      var folded = this.folded[type]
      var marker: CodeMirror.TextMarker
      while (marker = folded.pop()) marker.clear()
    }
  }
}

//#endregion

/** ADDON GETTER (Singleton Pattern): a editor can have only one Fold instance */
export const getAddon = Addon.Getter("Fold", Fold)
declare global { namespace HyperMD { interface HelperCollection { Fold?: Fold } } }

/********************************************************************************** */

// register default folders

registerFolder("image", ImageFolder, true)
registerFolder("link", LinkFolder, true)
