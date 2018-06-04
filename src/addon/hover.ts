// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
//
// DESCRIPTION: When mouse hovers on a link or footnote ref, shows related footnote
//

import * as CodeMirror from 'codemirror'
import { Addon, FlipFlop, expandRange, suggestedEditorConfig } from '../core'
import './read-link'

import { cm_t } from '../core/type'
import { Link } from './read-link'


/********************************************************************************** */

/** convert footnote text into HTML. Note that `markdown` may be empty and you may return `null` to supress the tooltip */
export type Convertor = (footnote: string, markdown: string) => string

var markdownToHTML: (text: string) => string =
  (typeof marked === 'function') ? marked : (text: string) => {
    text = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/  /g, ' &nbsp;')
    return "<pre>" + text + "</pre>"
  }

/** if `marked` exists, use it; else, return safe html */
export function defaultConvertor(footnote: string, text: string): string {
  if (!text) return null
  return markdownToHTML(text)
}

/********************************************************************************** */
//#region Addon Options

export interface Options extends Addon.AddonOptions {
  /** Enable Hover features or not. */ // TODO: write doc here
  enabled: boolean

  xOffset: number

  /**
   * function to decide the tooltip's content.
   *
   * First parameter is the name of footnote (without square brackets),
   * and the second is footnote Markdown content (might be `null`, if not found).
   * This function shall returns HTML string or `null`.
   *
   * @see Convertor
   * @see defaultConvertor
   */
  convertor: Convertor
}

export const defaultOption: Options = {
  enabled: false,
  xOffset: 10,
  convertor: defaultConvertor,
}

export const suggestedOption: Partial<Options> = {
  enabled: true,  // we recommend lazy users to enable this fantastic addon!
}

export type OptionValueType = Partial<Options> | boolean | Convertor;

declare global {
  namespace HyperMD {
    interface EditorConfiguration {
      /**
       * Options for Hover.
       *
       * You may also provide a `false` to disable it;
       * a `true` to enable it with defaultOption (except `enabled`);
       * or a Convertor to decide the content of tooltip.
       *
       * @see Convertor
       */
      hmdHover?: OptionValueType
    }
  }
}

suggestedEditorConfig.hmdHover = suggestedOption

CodeMirror.defineOption("hmdHover", defaultOption, function (cm: cm_t, newVal: OptionValueType) {

  ///// convert newVal's type to `Partial<Options>`, if it is not.

  if (!newVal || typeof newVal === "boolean") {
    newVal = { enabled: !!newVal }
  } else if (typeof newVal === "function") {
    newVal = { enabled: true, convertor: newVal }
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

export class Hover implements Addon.Addon, Options /* if needed */ {
  xOffset: number;
  convertor: Convertor;
  enabled: boolean;

  constructor(public cm: cm_t) {
    // options will be initialized to defaultOption when constructor is finished

    new FlipFlop(
      /* ON  */() => { lineDiv.addEventListener("mouseenter", evhandler, true) },
      /* OFF */() => { lineDiv.removeEventListener("mouseenter", evhandler, true); this.hideInfo() }
    ).bind(this, "enabled", true)

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
  }

  private lineDiv: HTMLDivElement // CodeMirror's line container
  public tooltipDiv: HTMLDivElement
  public tooltipContentDiv: HTMLDivElement
  public tooltipIndicator: HTMLDivElement

  mouseenter(ev: MouseEvent) {
    var cm = this.cm, target = ev.target as HTMLElement
    var className = target.className
    if (target == this.tooltipDiv || (target.compareDocumentPosition && (target.compareDocumentPosition(this.tooltipDiv) & 8) == 8)) {
      return
    }

    var mat: RegExpMatchArray
    if (target.nodeName !== "SPAN" || !(mat = className.match(/(?:^|\s)cm-(hmd-barelink2?|hmd-footref2)(?:\s|$)/))) {
      this.hideInfo()
      return
    }

    var pos = cm.coordsChar({ left: ev.clientX, top: ev.clientY }, "window")
    let footnoteName = null
    var footnote: Link = null

    const hover_type = mat[1] // hmd-barelink|hmd-link-url-s
    var range = expandRange(cm, pos, hover_type)
    if (range) {
      footnoteName = cm.getRange(range.from, range.to)
      footnoteName = footnoteName.slice(1, -1)
      if (footnoteName) footnote = cm.hmdReadLink(footnoteName, pos.line) || null
    }

    var convertor = this.convertor || defaultConvertor
    var html = convertor(footnoteName, footnote && footnote.content || null)

    if (!html) {
      this.hideInfo()
      return
    }

    this.showInfo(html, target)
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

//#endregion

/** ADDON GETTER (Singleton Pattern): a editor can have only one Hover instance */
export const getAddon = Addon.Getter("Hover", Hover, defaultOption /** if has options */)
declare global { namespace HyperMD { interface HelperCollection { Hover?: Hover } } }
