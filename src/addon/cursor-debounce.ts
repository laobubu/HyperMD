// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
//
// When a user clicks to move the cursor, releasing mouse button,
// the user's hand might shake and an unexcepted selection will be made.
// This addon suppresses the shake.
//

import CodeMirror from 'codemirror'
import { Addon, FlipFlop } from '../core'
import { cm_t } from '../core/type'

/********************************************************************************** */
// Some parameter LGTM

const silenceDuration = 100, distance = 5

/********************************************************************************** */
/** ADDON OPTIONS */

const OptionName = "hmdCursorDebounce"
type OptionValueType = boolean

CodeMirror.defineOption(OptionName, false, function (cm: cm_t, newVal: OptionValueType) {
  const enabled = !!newVal

  ///// apply config
  var inst = getAddon(cm)
  inst.ff_enable.setBool(enabled)
})

declare global { namespace HyperMD { interface EditorConfiguration { [OptionName]?: OptionValueType } } }


/********************************************************************************** */
/** ADDON CLASS */

const AddonAlias = "cursorDebounce"
export class CursorDebounce implements Addon.Addon {
  public ff_enable: FlipFlop  // bind/unbind events

  constructor(public cm: cm_t) {
    // add your code here

    this.ff_enable = new FlipFlop(
      /* ON  */() => { cm.on('mousedown', this.mouseDownHandler) },
      /* OFF */() => { cm.off('mousedown', this.mouseDownHandler) }
    )
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


declare global { namespace HyperMD { interface HelperCollection { [AddonAlias]?: CursorDebounce } } }

/** ADDON GETTER: Only one addon instance allowed in a editor */
export const getAddon = Addon.Getter(AddonAlias, CursorDebounce)
