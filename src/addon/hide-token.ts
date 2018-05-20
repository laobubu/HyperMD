// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
//
// Auto show/hide markdown tokens like `##` or `*`
// Works with `hypermd` mode, require special CSS rules
//

import CodeMirror from 'codemirror'
import { Addon, FlipFlop, cm_internal, getEveryCharToken } from '../core'
import { cm_t } from '../core/type'


/********************************************************************************** */
//#region Addon Options

export interface MyOptions extends Addon.AddonOptions {
  enabled: boolean
  tokenTypes: string[]
  // add your options here
}

export const defaultOption: MyOptions = {
  enabled: false,
  tokenTypes: "em|strong|strikethrough|code|link".split("|"),
  // add your default values here
}

const OptionName = "hmdHideToken"
type OptionValueType = Partial<MyOptions> | boolean | string | string[];

CodeMirror.defineOption(OptionName, defaultOption, function (cm: cm_t, newVal: OptionValueType) {
  const enabled = !!newVal

  if (!enabled || typeof newVal === "boolean") {
    newVal = { enabled: enabled }
  } else if (typeof newVal === "string") {
    newVal = { enabled: true, tokenTypes: newVal.split("|") }
  } else if (newVal instanceof Array) {
    newVal = { enabled: true, tokenTypes: newVal }
  }

  var newCfg = Addon.migrateOption(newVal, defaultOption)

  ///// apply config
  var inst = getAddon(cm)

  inst.ff_enable.setBool(newCfg.enabled)

  ///// write new values into cm
  for (var k in defaultOption) inst[k] = newCfg[k]
})

declare global { namespace HyperMD { interface EditorConfiguration { [OptionName]?: OptionValueType } } }

//#endregion

/********************************************************************************** */
//#region Addon Class

const hideClassName = "hmd-hidden-token"

/**
 * 1. when renderLine, add "hmd-hidden-token" to each <span>
 * 2.
 */
export class HideToken implements Addon.Addon, MyOptions /* if needed */ {
  tokenTypes: string[];
  enabled: boolean;

  public ff_enable: FlipFlop  // bind/unbind events

  constructor(public cm: cm_t) {
    // options will be initialized to defaultOption (if exists)
    // add your code here

    this.ff_enable = new FlipFlop(
      /* ON  */() => {
        cm.on("cursorActivity", this.cursorActivityHandler)
        cm.on("renderLine", this.renderLineHandler)
      },
      /* OFF */() => {
        cm.off("cursorActivity", this.cursorActivityHandler)
        cm.off("renderLine", this.renderLineHandler)
      }
    )
  }

  renderLineHandler = (cm: cm_t, line: CodeMirror.LineHandle, el: HTMLPreElement) => {
    this.procLine(line)
  }

  recovery() {
    var lastShown = this.lastShown
    for (const span of lastShown) {

    }
    lastShown.splice(0)
  }

  procLine(line: CodeMirror.LineHandle) {
    const cm = this.cm
    const lineNo = line.lineNo()
    const lv = cm_internal.findViewForLine(cm, lineNo)
    const mapInfo = cm_internal.mapFromLineView(lv, line, lineNo)

    const map = mapInfo.map
    const nodeCount = map.length / 3

    for (let idx = 0, i = 0; idx < nodeCount; idx++ , i += 3) {
      const text = map[i + 2] as Text
      const span = text.parentElement
      if (text.nodeType !== Node.TEXT_NODE || !span) continue

      const spanClass = span.className
      for (const type of this.tokenTypes) {
        if (type === 'link' && /cm-hmd-footref|cm-hmd-footnote|cm-hmd-barelink/.test(spanClass)) {
          // ignore footnote names, footrefs, barelinks
          continue
        }
        if (spanClass.indexOf("cm-formatting-" + type + " ") !== -1) {
          // found one! do hiding
          span.className += " " + hideClassName
          break
        }
      }
    }
  }

  lastShown: HTMLSpanElement[] = []

  cursorActivityHandler = (doc: CodeMirror.Doc) => {
    this.recovery()
  }
}

//#endregion

/** ADDON GETTER (Singleton Pattern): a editor can have only one MyAddon instance */
const AddonAlias = "hideToken"
export const getAddon = Addon.Getter(AddonAlias, HideToken, defaultOption)
declare global { namespace HyperMD { interface HelperCollection { [AddonAlias]?: HideToken } } }
