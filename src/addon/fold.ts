// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
//
// DESCRIPTION: Turn Markdown markers into real images, link icons etc. Support custom folders.
//
// You may set `hmdFold.customFolders` option to fold more, where `customFolders` is Array<FolderFunc>
//

import * as CodeMirror from 'codemirror'
import { Addon, FlipFlop, debounce, TokenSeeker, suggestedEditorConfig, normalVisualConfig } from '../core'
import { Position, Token } from 'codemirror'
import { cm_t } from '../core/type'
import { rangesIntersect, orderedRange } from '../core/cm_utils';

const DEBUG = false

const FlagArray = typeof Uint8Array === 'undefined' ? (Array as typeof Uint8Array) : Uint8Array;

export interface HmdTextMarker extends CodeMirror.TextMarker {
  /** @internal when caret in this range, break this marker */
  _hmd_crange?: [Position, Position]

  /** @internal the folder type of current marker */
  _hmd_fold_type?: string
}

/********************************************************************************** */
//#region FolderFunc & FoldStream declaration

/**
 * 1. Check if `token` is a **BEGINNING TOKEN** of fold-able text (eg. "!" for images)
 * 2. Use `stream.findNext` to find the end of the text to be folded (eg. ")" or "]" of link/URL, for images)
 * 3. Compose a range `{from, to}`
 *    - `from` is always `{ line: stream.lineNo, ch: token.start }`
 * 4. Check if `stream.requestRange(from, to[, cfrom, cto])` returns `RequestRangeResult.OK`
 *    - if not ok, you shall return `null` immediately.
 *    - the optional `cfrom` and `cto` compose a range, let's call it "crange".
 *      - If user's caret moves into that "crange", your marker will break automatically.
 *      - If "crange" is not provided, it will be the same as `[from, to]`
 *      - Note that "crange" can be bigger / smaller than the marker's range,
 *        as long as they have intersection.
 *      - In some cases, to prevent auto-breaking, please use `cfrom = from` and `cto = from`
 *        (and, yes, "crange" can be a zero-width range)
 * 5. Use `stream.cm.markText(from, to, options)` to fold text, and return the marker
 *
 * @param token current checking token. a shortcut to `stream.lineTokens[stream.i_token]`
 * @returns a TextMarker if folded.
 */
export type FolderFunc = (stream: FoldStream, token: CodeMirror.Token) => HmdTextMarker;

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
  findNext(condition: TokenSeeker.ConditionType, maySpanLines?: boolean, since?: Position): TokenSeeker.ResultType

  /**
   * In current line, find next Token that matches the condition SINCE the token with given index
   * This function will NOT make the stream precede!
   *
   * @param condition a RegExp to check token.type, or a function check the Token
   * @param i_token_since default: i_token+1 (the next of current token)
   */
  findNext(condition: TokenSeeker.ConditionType, i_token_since: number): TokenSeeker.ResultType

  /**
   * Before creating a TextMarker, check if the range is good to use.
   *
   * Do NOT create TextMarker unless this returns `RequestRangeResult.OK`
   */
  requestRange(from: Position, to: Position): RequestRangeResult

  /**
   * Before creating a TextMarker, check if the range is good to use.
   *
   * Do NOT create TextMarker unless this returns `RequestRangeResult.OK`
   *
   * @param cfrom if cfrom <= caret <= cto, the TextMarker will be removed.
   * @param cto   if cfrom <= caret <= cto, the TextMarker will be removed.
   */
  requestRange(from: Position, to: Position, cfrom: Position, cto: Position): RequestRangeResult
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
//#region Utils

/** break a TextMarker, move cursor to where marker is */
export function breakMark(cm: cm_t, marker: HmdTextMarker, chOffset?: number) {
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
  public folded: Record<string, HmdTextMarker[]> = {};

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
      var changedMarkers: HmdTextMarker[] = []

      for (const change of changes) {
        let markers = cm.findMarks(change.from, change.to) as HmdTextMarker[]
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
      if (DEBUG) console.time('CA')

      let lineStuff: {
        [lineNo: string]: {
          lineNo: number, ch: number[],
          markers: [HmdTextMarker, number, number][] // two numbers are: char_from char_to
        }
      } = {}

      function addPosition(pos: CodeMirror.Position) {
        const lineNo = pos.line
        if (!(lineNo in lineStuff)) {
          let lh = cm.getLineHandle(pos.line)
          let ms = lh.markedSpans || []
          let markers = [] as [HmdTextMarker, number, number][]
          for (let i = 0; i < ms.length; i++) {
            let marker = ms[i].marker as HmdTextMarker
            if ('_hmd_crange' in marker) {
              let from = marker._hmd_crange[0].line < lineNo ? 0 : marker._hmd_crange[0].ch
              let to = marker._hmd_crange[1].line > lineNo ? lh.text.length : marker._hmd_crange[1].ch
              markers.push([marker, from, to])
            }
          }
          lineStuff[lineNo] = {
            lineNo, ch: [pos.ch],
            markers,
          }
        } else {
          lineStuff[lineNo].ch.push(pos.ch)
        }
      }

      cm.listSelections().forEach(selection => {
        addPosition(selection.anchor)
        addPosition(selection.head)
      })

      for (let tmp_id in lineStuff) {
        let lineData = lineStuff[tmp_id]
        if (!lineData.markers.length) continue

        for (let i = 0; i < lineData.ch.length; i++) {
          const ch = lineData.ch[i]
          for (let j = 0; j < lineData.markers.length; j++) {
            let [marker, from, to] = lineData.markers[j]
            if (from <= ch && ch <= to) {
              marker.clear()
              lineData.markers.splice(j, 1)
              j--
            }
          }
        }
      }

      if (DEBUG) console.timeEnd('CA')

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
  requestRange(from: Position, to: Position, cfrom?: Position, cto?: Position): RequestRangeResult {
    if (!cto) cto = to
    if (!cfrom) cfrom = from

    const cm = this.cm

    var markers = cm.findMarks(from, to)
    if (markers.length !== 0) return RequestRangeResult.HAS_MARKERS

    this._quickFoldHint.push(from.line)

    // store "crange" for the coming marker
    this._lastCRange = [cfrom, cto]

    const selections = cm.listSelections()
    for (let i = 0; i < selections.length; i++) {
      let oselection = orderedRange(selections[i])
      // note that "crange" can be bigger or smaller than marked-text range.
      if (rangesIntersect(this._lastCRange, oselection) || rangesIntersect([from, to], oselection)) {
        return RequestRangeResult.CURSOR_INSIDE
      }
    }

    this._quickFoldHint.push(cfrom.line)

    return RequestRangeResult.OK
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

    if (DEBUG) {
      console.log("start fold! ", fromLine, toLine)
    }

    cm.operation(() => cm.eachLine(fromLine, toLine, line => {
      var lineNo = line.lineNo()
      if (lineNo < this.lineNo) return // skip current line...
      else if (lineNo > this.lineNo) this.setPos(lineNo, 0) // hmmm... maybe last one is empty line

      // all the not-foldable chars are marked
      var charMarked = new FlagArray(line.text.length)
      {
        // populate charMarked array.
        // @see CodeMirror's findMarksAt
        let lineMarkers = line.markedSpans
        if (lineMarkers) {
          for (let i = 0; i < lineMarkers.length; ++i) {
            let span = lineMarkers[i]
            let spanFrom = span.from == null ? 0 : span.from
            let spanTo = span.to == null ? charMarked.length : span.to
            for (let j = spanFrom; j < spanTo; j++) charMarked[j] = 1
          }
        }
      }

      const tokens = this.lineTokens

      while (this.i_token < tokens.length) {
        var token = tokens[this.i_token]
        var type: string
        var marker: HmdTextMarker = null

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
          // try all enabled folders in registry
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
          marker._hmd_crange = this._lastCRange;
          marker.on('clear', (from, to) => {
            var markers = this.folded[type]
            var idx: number
            if (markers && (idx = markers.indexOf(marker)) !== -1) markers.splice(idx, 1)
            this._quickFoldHint.push(from.line)
          })

          if (DEBUG) {
            console.log("[FOLD] New marker ", type, from, to, marker)
          }

          // now let's update the pointer position

          if (from.line > lineNo || from.ch > token.start) {
            // there are some not-marked chars after current token, before the new marker
            // first, advance the pointer
            this.i_token++
            // then mark the hidden chars as "marked"
            let fromCh = from.line === lineNo ? from.ch : charMarked.length
            let toCh = to.line === lineNo ? to.ch : charMarked.length
            for (let i = fromCh; i < toCh; i++) charMarked[i] = 1
          } else {
            // classical situation
            // new marker starts since current token
            if (to.line !== lineNo) {
              this.setPos(to.line, to.ch)
              return // nothing left in this line
            } else {
              this.setPos(to.ch) // i_token will be updated by this.setPos()
            }
          }
        }
      }
    }))
  }

  /** stores every affected lineNo */
  private _quickFoldHint: number[] = []
  private _lastCRange: [Position, Position]

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
