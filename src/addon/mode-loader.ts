// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
//
// if a code-fence with CodeMirror-mode-not-loaded language is detected,
// load the mode and reHighlight the code-fence block
//

import CodeMirror, { LineHandle } from 'codemirror'
import { Addon, FlipFlop } from '../core'
import { cm_t } from '../core/type'
import 'codemirror/mode/meta'

/********************************************************************************** */
/** ADDON OPTIONS */

const OptionName = "hmdLoadModeFrom"
type OptionValueType = string | false

CodeMirror.defineOption(OptionName, false, function (cm: cm_t, newVal: OptionValueType) {
  const enabled = !!newVal

  ///// apply config
  var inst = getAddon(cm)

  inst.ff_enable.setBool(enabled)
  inst.source = newVal as string
})

declare global { namespace HyperMD { interface EditorConfiguration { [OptionName]?: OptionValueType } } }


/********************************************************************************** */
/** ADDON CLASS */

const AddonAlias = "modeLoader"
export class ModeLoader implements Addon.Addon {
  public ff_enable: FlipFlop  // bind/unbind events

  public source = "./node_modules/codemirror/"; // url prefix

  constructor(public cm: cm_t) {
    // add your code here

    this.ff_enable = new FlipFlop(
      /* ON  */() => { cm.on("renderLine", this.rlHandler) },
      /* OFF */() => { cm.off("renderLine", this.rlHandler) }
    )
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
  private rlHandler = (cm: cm_t, line: LineHandle) => {
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


declare global { namespace HyperMD { interface HelperCollection { [AddonAlias]?: ModeLoader } } }

/** ADDON GETTER: Only one addon instance allowed in a editor */
export const getAddon = Addon.Getter(AddonAlias, ModeLoader)
