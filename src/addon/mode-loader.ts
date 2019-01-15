// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
//
// DESCRIPTION: Load code highlighting modes (aka. profiles) automatically
//

import * as CodeMirror from 'codemirror'
import { Addon, FlipFlop, suggestedEditorConfig } from '../core'
import { cm_t } from '../core/type'
import 'codemirror/mode/meta'

declare global { const requirejs: (modules: string[], factory: Function) => any }

/** user may provider an async CodeMirror mode loader function */
export type LoaderFunc = (mode: string, successCb: Function, errorCb: Function) => void

/********************************************************************************** */
//#region Addon Options

export interface Options extends Addon.AddonOptions {
  /**
   * providing a source of codemirror modes
   *
   * - (a `LoaderFunc` function)
   * - `"http://cdn.xxxxx.com/codemirror/v4.xx/"`
   * - `"./node_modules/codemirror/"`            <- relative to webpage's URL
   * - `"~codemirror/"`                          <- for requirejs
   */
  source: string | LoaderFunc
}

export const defaultOption: Options = {
  source: null,
}

export const suggestedOption: Partial<Options> = {
  source: (typeof requirejs === 'function') ? "~codemirror/" : "https://cdn.jsdelivr.net/npm/codemirror/",
}

export type OptionValueType = Partial<Options> | boolean | string | LoaderFunc;

declare global {
  namespace HyperMD {
    interface EditorConfiguration {
      /**
       * Options for ModeLoader.
       *
       * You may also provide:
       * - boolean: `true` will use suggested source
       * - `string` or `LoaderFunc` as the new source
       *
       * @see LoaderFunc
       */
      hmdModeLoader?: OptionValueType
    }
  }
}

suggestedEditorConfig.hmdModeLoader = suggestedOption

CodeMirror.defineOption("hmdModeLoader", defaultOption, function (cm: cm_t, newVal: OptionValueType) {

  ///// convert newVal's type to `Partial<Options>`, if it is not.

  if (!newVal || typeof newVal === "boolean") {
    newVal = { source: newVal && suggestedOption.source || null }
  } else if (typeof newVal === "string" || typeof newVal === "function") {
    newVal = { source: newVal }
  }

  ///// apply config and write new values into cm

  var inst = getAddon(cm)
  for (var k in defaultOption) {
    inst[k] = (k in newVal) ? newVal[k] : defaultOption[k]
  }
})

//#endregion

/********************************************************************************** */
//#region Addon Class

export class ModeLoader implements Addon.Addon, Options {
  source: string | LoaderFunc;

  constructor(public cm: cm_t) {
    // options will be initialized to defaultOption when constructor is finished
    // add your code here

    new FlipFlop() // use FlipFlop to detect if a option is changed
      .bind(this, "source")
      .ON(() => { cm.on("renderLine", this.rlHandler) })
      .OFF(() => { cm.off("renderLine", this.rlHandler) })
  }


  /** trig a "change" event on one line */
  touchLine(lineNo: number) {
    var line = this.cm.getLineHandle(lineNo);
    var lineLen = line.text.length;
    this.cm.replaceRange(line.text.charAt(lineLen - 1), { line: lineNo, ch: lineLen - 1 }, { line: lineNo, ch: lineLen });
  }

  private _loadingModes: { [mode: string]: number[] } = {}

  /**
   * load a mode, then refresh editor
   *
   * @param  mode
   * @param  line >=0 : add into waiting queue    <0 : load and retry up to `-line` times
   */
  startLoadMode(mode: string, line: number) {
    var linesWaiting = this._loadingModes;
    var self = this;
    if (line >= 0 && mode in linesWaiting) {
      linesWaiting[mode].push(line);
      return;
    }

    // start load a mode
    if (line >= 0)
      linesWaiting[mode] = [line];
    var successCb = function () {
      console.log("[HyperMD] mode-loader loaded " + mode);
      const lines = linesWaiting[mode]
      self.cm.operation(() => {
        for (var i = 0; i < lines.length; i++) {
          self.touchLine(lines[i]);
        }
      })
      delete linesWaiting[mode]
    };
    var errorCb = function () {
      console.warn("[HyperMD] mode-loader failed to load mode " + mode + " from ", url);
      if (line === -1) {
        // no more chance
        return;
      }
      console.log("[HyperMD] mode-loader will retry loading " + mode);
      setTimeout(function () {
        self.startLoadMode(mode, line >= 0 ? -3 : (line + 1));
      }, 1000);
    };

    if (typeof this.source === "function") {
      this.source(mode, successCb, errorCb)
      return
    }

    var url = this.source + "mode/" + mode + "/" + mode + ".js";
    if (typeof requirejs === 'function' && url.charAt(0) === "~") {
      // require.js
      requirejs([
        url.slice(1, -3),
      ], successCb);
    }
    else {
      // trandition loadScript
      var script = document.createElement('script');
      script.onload = successCb;
      script.onerror = errorCb;
      script.src = url;
      document.head.appendChild(script);
    }
  }

  /**
   * CodeMirror "renderLine" event handler
   */
  private rlHandler = (cm: cm_t, line: CodeMirror.LineHandle) => {
    var lineNo = line.lineNo();
    var text = line.text || "", mat = text.match(/^```\s*(\S+)/);
    if (mat) { // seems found one code fence
      var lang = mat[1];
      var modeInfo = CodeMirror.findModeByName(lang);
      var modeName = modeInfo && modeInfo.mode;
      if (modeName && !(modeName in CodeMirror.modes)) {
        // a not-loaded mode is found!
        // now we shall load mode `modeName`
        this.startLoadMode(modeName, lineNo);
      }
    }
  }
}

//#endregion

/** ADDON GETTER (Singleton Pattern): a editor can have only one ModeLoader instance */
export const getAddon = Addon.Getter("ModeLoader", ModeLoader, defaultOption /** if has options */)
declare global { namespace HyperMD { interface HelperCollection { ModeLoader?: ModeLoader } } }
