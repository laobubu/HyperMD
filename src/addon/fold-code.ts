// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
//
// DESCRIPTION: Turn code blocks into flow charts / playground sandboxes etc.
//
// =============================================
// **START AN ADDON** Check List
// =============================================
// 1. Replace "FoldCode" to your addon's name (note the first letter is upper-case)
// 2. Edit #region CodeMirror Extension
//    - If don't need this, delete the whole region
//    - Otherwise, delete hmdRollAndDice and add your own functions
// 3. Edit #region Addon Class
//    - You might want to reading CONTRIBUTING.md
// 4. Edit #region Addon Options
//    - It's highly suggested to finish the docs, see //TODO: write doc
//    - Note the defaultOption shall be the status when this addon is disabled!
//    - As for `FlipFlop` and `ff_*`, you might want to reading CONTRIBUTING.md
// 5. Remove this check-list
// 6. Modify `DESCRIPTION: ` above
// 6. Build, Publish, Pull Request etc.
//

import * as CodeMirror from 'codemirror'
import { Addon, suggestedEditorConfig } from '../core'
import { cm_t } from '../core/type'

import { FolderFunc, registerFolder, getAddon as getFoldAddon, FoldStream, RequestRangeResult, breakMark } from './fold'


//#region CodeRenderer ------------------------------------------------------------

/**
 * FoldInfo is the bridge between your rendered element and HyperMD editor.
 */
export interface FoldInfo {
  /** the languange name after leading triple-backtick in Markdown */
  readonly lang: string

  readonly editor: cm_t
  readonly marker: CodeMirror.TextMarker
  readonly lineWidget: CodeMirror.LineWidget

  /** CodeRenderer returned element */
  readonly el: HTMLElement

  /** call this if you want to remove rendered result, and move cursor into the code block */
  readonly break: () => void

  /** if rendererd element's dimension changed, call this! */
  readonly changed: () => void

  /** called when this element is removed */
  onRemove?: (info: FoldInfo) => void

  /** (not implemented) */
  onUpdate?: (newCode: string, info: FoldInfo) => void
}

/**
 * A CodeRenderer turns code into flow chart / playground sandbox etc,
 * returning the rendered HTML element.
 *
 * 1. the CodeRenderer can set `info.onRemove` and `info.onUpdate` callbacks
 * 2. if rendered element's dimension is changed, you must call `info.changed()`
 * 3. do NOT use destructuring assignment with `info` !!!
 */
export type CodeRenderer = (code: string, info: FoldInfo) => HTMLElement;

//#endregion


//#region CodeRenderer Registry -----------------------------------------------------

export interface RegistryItem {
  name: string;

  /** enable this CodeRenderer by default */
  suggested?: boolean;

  /** the languange name after leading triple-backtick in Markdown  */
  pattern: string | RegExp | ((language: string) => boolean);

  renderer: CodeRenderer;
}

export var rendererRegistry: Record<string, RegistryItem> = {}

/**
 * Add a CodeRenderer to the System CodeRenderer Registry
 *
 * @param lang
 * @param folder
 * @param suggested enable this folder in suggestedEditorConfig
 * @param force if a folder with same name is already exists, overwrite it. (dangerous)
 */
export function registerRenderer(info: RegistryItem, force?: boolean) {
  if (!info || !info.name || !info.renderer) return

  var name = info.name;
  var pattern = info.pattern;

  var registry = rendererRegistry
  if (name in registry) {
    if (!force) {
      throw new Error(`CodeRenderer ${name} already exists`);
    }
  }

  if (typeof pattern === 'string') {
    let t = pattern.toLowerCase();
    pattern = (lang) => (lang.toLowerCase() === t);
  } else if (pattern instanceof RegExp) {
    pattern = (lang) => (info.pattern as RegExp).test(lang);
  }

  var newInfo: RegistryItem = {
    name,
    suggested: !!info.suggested,
    pattern,
    renderer: info.renderer,
  }

  registry[name] = newInfo;
  defaultOption[name] = false;
  suggestedOption[name] = newInfo.suggested;
}

//#endregion


//#region FolderFunc for Addon/Fold -----------------------------------------------------

/** the FolderFunc for Addon/Fold */
export const CodeFolder: FolderFunc = (stream, token) => {
  if (
    token.start !== 0 ||
    !token.type ||
    token.type.indexOf('HyperMD-codeblock-begin') === -1 ||
    !/[-\w]+\s*$/.test(token.string)
  ) {
    return null;
  }
  return getAddon(stream.cm).fold(stream, token);
}

registerFolder("code", CodeFolder, true)

//#endregion


/********************************************************************************** */
//#region Addon Options

export type Options = Record<string, boolean>

export const defaultOption: Options = {
  /* will be populated by registerRenderer() */
}

export const suggestedOption: Options = {
  /* will be populated by registerRenderer() */
}

export type OptionValueType = Options | boolean;

declare global {
  namespace HyperMD {
    interface EditorConfiguration {
      /**
       * Options for FoldCode.
       *
       * The flow charts / playground sandboxes from codeblocks, are rendered by CodeRenderer s.
       *
       * By default, `suggested` renderers will be enabled.
       * You can still choosed to enable/disable some of them via `hmdFoldCode` the editor option.
       *
       * **NOTE**: make sure `hmdFold.code` is `true`, otherwise, this option will not work.
       *
       * `hmdFoldCode` accepts 3 forms:
       *
       * 1. `true` -- only enable suggested renderers
       * 2. `false` -- disable all renderers
       * 3. `{ [RendererType]: boolean }` -- enable / disable CodeRenderer
       *    - Note: registered but not configured kinds will be disabled
       */
      hmdFoldCode?: OptionValueType
    }
  }
}

suggestedEditorConfig.hmdFoldCode = suggestedOption

CodeMirror.defineOption("hmdFoldCode", defaultOption, function (cm: cm_t, newVal: OptionValueType) {

  ///// convert newVal's type to `Record<string, boolean>`, if it is not.

  if (!newVal || typeof newVal === "boolean") {
    newVal = newVal ? suggestedOption : defaultOption
  }

  ///// apply config
  var inst = getAddon(cm)
  for (const type in rendererRegistry) {
    inst.setStatus(type, newVal[type])
  }
  // then, folding task will be queued by setStatus()

})

//#endregion

/********************************************************************************** */
//#region Addon Class

type FoldInfo_Master = { -readonly [P in keyof FoldInfo]: FoldInfo[P] }

export class FoldCode implements Addon.Addon {
  /**
   * stores renderer status for current editor
   * @private To enable/disable renderer, use `setStatus()`
   */
  private _enabled: Record<string, boolean> = {}

  /** renderers' output goes here */
  public folded: Record<string, FoldInfo_Master[]> = {};

  /** enable/disable one kind of renderer, in current editor */
  setStatus(type: string, enabled: boolean) {
    if (!(type in rendererRegistry)) return

    if (!this._enabled[type] !== !enabled) {
      this._enabled[type] = !!enabled

      if (enabled) getFoldAddon(this.cm).startFold()
      else this.clear(type)
    }
  }

  /** Clear one type of rendered TextMarkers */
  clear(type: string) {
    var folded = this.folded[type]
    if (!folded || !folded.length) return
    var info: FoldInfo_Master
    while (info = folded.pop()) info.marker.clear()
  }

  constructor(public cm: cm_t) {
  }

  fold(stream: FoldStream, token: CodeMirror.Token): CodeMirror.TextMarker {
    if (token.start !== 0 || !token.type || token.type.indexOf('HyperMD-codeblock-begin') === -1) return null
    var tmp = /([-\w]+)\s*$/.exec(token.string)
    var lang = tmp && tmp[1].toLowerCase()
    if (!lang) return null

    let renderer: CodeRenderer;
    let type: string;

    var cm = this.cm, registry = rendererRegistry, _enabled = this._enabled
    for (const type_i in registry) {
      let r = registry[type_i]
      if (!_enabled[type_i]) continue
      if (!(r.pattern as (lang: string) => boolean)(lang)) continue

      type = type_i;
      renderer = r.renderer;
      break;
    }

    if (!type) return null

    let from: CodeMirror.Position = { line: stream.lineNo, ch: 0 }
    let to: CodeMirror.Position = null

    // find the end of code block

    let lastLineCM = cm.lastLine()
    let endLine = stream.lineNo + 1
    do {
      let s = cm.getTokenAt({ line: endLine, ch: 1 })
      if (s && s.type && s.type.indexOf('HyperMD-codeblock-end') !== -1) {
        //FOUND END!
        to = { line: endLine, ch: s.end };
        break;
      }
    } while (++endLine < lastLineCM);

    if (!to) return null;

    // request the range

    let rngReq = stream.requestRange(from, to);
    if (rngReq !== RequestRangeResult.OK) return null;

    // now we can call renderer

    let code = cm.getRange({ line: from.line + 1, ch: 0 }, { line: to.line, ch: 0 })
    let info: FoldInfo_Master = {
      editor: cm,
      lang,
      marker: null,
      lineWidget: null,
      el: null,
      break: undefined_function,
      changed: undefined_function,
    }

    let el = info.el = renderer(code, info);
    if (!el) {
      info.marker.clear();
      return null;
    }

    //-----------------------------

    let $wrapper = document.createElement('div')
    $wrapper.className = contentClass + type
    $wrapper.style.minHeight = '1em'
    $wrapper.appendChild(el)


    let lineWidget = info.lineWidget = cm.addLineWidget(to.line, $wrapper, {
      above: false,
      coverGutter: false,
      noHScroll: false,
      showIfHidden: false,
    })

    //-----------------------------

    let $stub = document.createElement('span')
    $stub.className = stubClass + type
    $stub.textContent = '<CODE>'

    let marker = info.marker = cm.markText(from, to, {
      replacedWith: $stub,
    })

    //-----------------------------

    let highlightON = () => $stub.className = stubClassHighlight + type
    let highlightOFF = () => $stub.className = stubClass + type

    $wrapper.addEventListener("mouseenter", highlightON, false)
    $wrapper.addEventListener("mouseleave", highlightOFF, false)

    info.changed = () => {
      lineWidget.changed();
    }

    info.break = () => {
      breakMark(cm, marker)
    }

    $stub.addEventListener('click', info.break, false)

    marker.on("clear", () => {
      var markers = this.folded[type]
      var idx: number
      if (markers && (idx = markers.indexOf(info)) !== -1) markers.splice(idx, 1);
      if (typeof info.onRemove === 'function') info.onRemove(info);
      lineWidget.clear();
    })

    if (!(type in this.folded)) this.folded[type] = [info];
    else this.folded[type].push(info);

    return marker;
  }
}

//#endregion


const contentClass = "hmd-fold-code-content hmd-fold-code-" // + renderer_type

const stubClass = "hmd-fold-code-stub hmd-fold-code-" // + renderer_type
const stubClassHighlight = "hmd-fold-code-stub highlight hmd-fold-code-" // + renderer_type
const undefined_function = () => { }

/** ADDON GETTER (Singleton Pattern): a editor can have only one FoldCode instance */
export const getAddon = Addon.Getter("FoldCode", FoldCode, defaultOption /** if has options */)
declare global { namespace HyperMD { interface HelperCollection { FoldCode?: FoldCode } } }
