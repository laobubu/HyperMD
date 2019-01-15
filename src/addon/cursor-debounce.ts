// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
//
// DESCRIPTION: A workaround for cheap and unstable mouses.
//
// When a user clicks to move the cursor, releasing mouse button,
// the user's hand might shake and an unexcepted selection will be made.
// This addon suppresses the shake.
//

import * as CodeMirror from 'codemirror'
import { Addon, FlipFlop, suggestedEditorConfig } from '../core'

import { cm_t } from '../core/type'

/********************************************************************************** */
// Some parameter LGTM

const silenceDuration = 100, distance = 5

/********************************************************************************** */
//#region Addon Options

export interface Options extends Addon.AddonOptions {
  /** Enable CursorDebounce features or not. */
  enabled: boolean
}

export const defaultOption: Options = {
  enabled: false,
}

export const suggestedOption: Partial<Options> = {
  enabled: true,  // works good with hide-token
}

export type OptionValueType = Partial<Options> | boolean;

declare global {
  namespace HyperMD {
    interface EditorConfiguration {
      /**
       * Options for CursorDebounce.
       *
       * You may also provide a `false` to disable it; a `true` to enable it
       */
      hmdCursorDebounce?: OptionValueType
    }
  }
}

suggestedEditorConfig.hmdCursorDebounce = suggestedOption

CodeMirror.defineOption("hmdCursorDebounce", defaultOption, function (cm: cm_t, newVal: OptionValueType) {

  ///// convert newVal's type to `Partial<Options>`, if it is not.

  if (!newVal || typeof newVal === "boolean") {
    newVal = { enabled: !!newVal }
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

export class CursorDebounce implements Addon.Addon, Options /* if needed */ {
  enabled: boolean;

  constructor(public cm: cm_t) {
    new FlipFlop(
      /* ON  */() => { cm.on('mousedown', this.mouseDownHandler) },
      /* OFF */() => { cm.off('mousedown', this.mouseDownHandler) }
    ).bind(this, "enabled", true)
  }

  private lastX: number
  private lastY: number
  private lastTimeout

  private mouseDownHandler = (cm: cm_t, ev: MouseEvent) => {
    this.lastX = ev.clientX
    this.lastY = ev.clientY
    const supressor = this.mouseMoveSuppress
    document.addEventListener("mousemove", supressor, true)

    if (this.lastTimeout) clearTimeout(this.lastTimeout)
    this.lastTimeout = setTimeout(() => {
      document.removeEventListener("mousemove", supressor, true)
      this.lastTimeout = null
    }, silenceDuration)
  }

  private mouseMoveSuppress = (ev: MouseEvent) => {
    if ((Math.abs(ev.clientX - this.lastX) <= distance) && (Math.abs(ev.clientY - this.lastY) <= distance))
      ev.stopPropagation()
  }
}

//#endregion

/** ADDON GETTER (Singleton Pattern): a editor can have only one CursorDebounce instance */
export const getAddon = Addon.Getter("CursorDebounce", CursorDebounce, defaultOption /** if has options */)
declare global { namespace HyperMD { interface HelperCollection { CursorDebounce?: CursorDebounce } } }
