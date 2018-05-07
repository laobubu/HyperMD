// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
//
// Hover on a link, showing related footnote
//

import CodeMirror from 'codemirror'
import marked from 'marked'
import { Addon, FlipFlop } from '../core'
import { cm_t } from '../core/type'
import './readlink'


/********************************************************************************** */
/** STATIC METHODS */

/** if `marked` exists, use it; else, return safe html */
export function text2html(text: string): string {
  if (typeof marked === 'function') return marked(text)
  return "<pre>" + text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/  /g, ' &nbsp;') + "</pre>"
}

/********************************************************************************** */
/** ADDON OPTIONS */

export interface HoverOptions extends Addon.AddonOptions {
  enabled: boolean
  xOffset: number
}

export const defaultOption: HoverOptions = {
  enabled: false,
  xOffset: 10,
}

const OptionName = "hmdHover"
type OptionValueType = Partial<HoverOptions> | boolean

CodeMirror.defineOption(OptionName, false, function (cm: cm_t, newVal: OptionValueType) {
  const enabled = !!newVal

  if (!enabled || typeof newVal === "boolean") {
    newVal = { enabled: enabled }
  }

  var newCfg = Addon.migrateOption(newVal, defaultOption)

  ///// apply config
  var inst = getAddon(cm)

  inst.ff_enable.setBool(newCfg.enabled)

  ///// write new values into cm
  for (var k in defaultOption) inst[k] = newCfg[k]
})

declare global { namespace HyperMD { interface EditorConfiguration { [OptionName]?: OptionValueType } } }


/********************************************************************************** */
/** ADDON CLASS */

const AddonAlias = "hover"
export class Hover implements Addon.Addon, HoverOptions {
  enabled: boolean;
  xOffset: number;

  private lineDiv: HTMLDivElement // CodeMirror's line container
  public tooltipDiv: HTMLDivElement
  public tooltipContentDiv: HTMLDivElement
  public tooltipIndicator: HTMLDivElement

  public ff_enable: FlipFlop  // bind/unbind events

  constructor(public cm: cm_t) {
    var lineDiv = cm.display.lineDiv as HTMLDivElement
    this.lineDiv = lineDiv

    var tooltip = document.createElement("div"),
      tooltipContent = document.createElement("div"),
      tooltipIndicator = document.createElement("div")
    tooltip.setAttribute("style", "position:absolute;z-index:99")
    tooltip.setAttribute("class", "HyperMD-hover")
    tooltip.setAttribute("cm-ignore-events", "true")

    tooltipContent.setAttribute("class", "HyperMD-hover-content")
    tooltip.appendChild(tooltipContent)

    tooltipIndicator.setAttribute("class", "HyperMD-hover-indicator")
    tooltip.appendChild(tooltipIndicator)

    this.tooltipDiv = tooltip
    this.tooltipContentDiv = tooltipContent
    this.tooltipIndicator = tooltipIndicator

    const evhandler = this.mouseenter.bind(this)

    this.ff_enable = new FlipFlop(
      /* ON  */() => { lineDiv.addEventListener("mouseenter", evhandler, true) },
      /* OFF */() => { lineDiv.removeEventListener("mouseenter", evhandler, true); this.hideInfo() }
    )
  }

  mouseenter(ev: MouseEvent) {
    var cm = this.cm, target = ev.target as HTMLElement
    var className = target.className
    if (target == this.tooltipDiv || (target.compareDocumentPosition && (target.compareDocumentPosition(this.tooltipDiv) & 8) == 8)) {
      return
    }

    if (!(
      target.nodeName == "SPAN" &&
      /cm-hmd-barelink\b/.test(className) &&
      !/cm-formatting\b/.test(className)
    )) {
      this.hideInfo()
      return
    }

    var pos = cm.coordsChar({ left: ev.clientX, top: ev.clientY })
    var url = target.textContent

    if (/cm-hmd-footref-lead/.test(className)) url = "^" + target.nextElementSibling.textContent
    else if (/cm-hmd-footref/.test(className)) url = "^" + url

    var footnote = cm.hmdReadLink(url, pos.line)
    if (!footnote) {
      this.hideInfo()
      return
    }

    this.showInfo(text2html(footnote.content), target)
  }

  showInfo(html: string, relatedTo: HTMLElement) {
    const b1 = relatedTo.getBoundingClientRect()
    const b2 = this.lineDiv.getBoundingClientRect()
    const tdiv = this.tooltipDiv
    var xOffset = this.xOffset

    this.tooltipContentDiv.innerHTML = html
    tdiv.style.left = (b1.left - b2.left - xOffset) + 'px'
    this.lineDiv.appendChild(tdiv)

    var b3 = tdiv.getBoundingClientRect()
    if (b3.right > b2.right) {
      xOffset = b3.right - b2.right
      tdiv.style.left = (b1.left - b2.left - xOffset) + 'px'
    }
    tdiv.style.top = (b1.top - b2.top - b3.height) + 'px'

    this.tooltipIndicator.style.marginLeft = xOffset + 'px'
  }

  hideInfo() {
    if (this.tooltipDiv.parentElement == this.lineDiv) {
      this.lineDiv.removeChild(this.tooltipDiv)
    }
  }
}

/** ADDON GETTER: Only one addon instance allowed in a editor */

declare global { namespace HyperMD { interface HelperCollection { [AddonAlias]?: Hover } } }
export const getAddon = Addon.Getter(AddonAlias, Hover, defaultOption)
