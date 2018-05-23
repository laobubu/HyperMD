// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
//
// Paste and convert to Markdown
//

import CodeMirror from 'codemirror'
import { Addon, FlipFlop } from '../core'
import { cm_t } from '../core/type'

/********************************************************************************** */
// Turndown is an excellent HTML-to-Markdown library
// Give it a try!

declare global {
  const TurndownService: any
  const turndownPluginGfm: any
}

const getTurndownService = (function () {
  var service: {
    turndown(html: string): string;
    use(plugin: any): void;
  } = null

  return function () {
    if (!service && typeof TurndownService === 'function') {
      var opts = {
        "headingStyle": "atx",
        "hr": "---",
        "bulletListMarker": "*",
        "codeBlockStyle": "fenced",
        "fence": "```",
        "emDelimiter": "*",
        "strongDelimiter": "**",
        "linkStyle": "inlined",
        "linkReferenceStyle": "collapsed"
      }
      service = new TurndownService(opts)

      if (typeof turndownPluginGfm !== 'undefined') {
        service.use(turndownPluginGfm.gfm)
      }

    }
    return service
  }
})()

/********************************************************************************** */

export type PasteConvertor = (html: string) => string | void
export const defaultConvertor: PasteConvertor =
  (html) => {
    // strip <a> without href
    html = html.replace(/<a([^>]*)>(.*?)<\/a>/ig, (s, attrs, content) => {
      if (!/href=/i.test(attrs)) return content
      return s
    })

    // maybe you don't need to convert, if there is no img/link/header...
    if (!/\<(?:(?:hr|img)|\/(?:h\d|strong|em|strikethrough|a|b|i|del)\>)/i.test(html)) return null

    const turndownService = getTurndownService()
    if (turndownService) return turndownService.turndown(html)

    return null
  }

/********************************************************************************** */
/** ADDON OPTIONS */

const OptionName = "hmdPaste"
type OptionValueType = PasteConvertor | boolean

CodeMirror.defineOption(OptionName, false, function (cm: cm_t, newVal: OptionValueType) {
  const enabled = !!newVal

  if (!enabled || typeof newVal === "boolean") {
    newVal = defaultConvertor
  }

  ///// apply config
  var inst = getAddon(cm)
  inst.ff_enable.setBool(enabled)
  inst.convertor = newVal
})

declare global { namespace HyperMD { interface EditorConfiguration { [OptionName]?: OptionValueType } } }


/********************************************************************************** */
/** ADDON CLASS */

const AddonAlias = "paste"
export class Paste implements Addon.Addon {
  public ff_enable: FlipFlop  // bind/unbind events

  public convertor: PasteConvertor = defaultConvertor

  constructor(public cm: cm_t) {
    // add your code here

    this.ff_enable = new FlipFlop(
      /* ON  */() => { cm.on('paste', this.pasteHandler) },
      /* OFF */() => { cm.off('paste', this.pasteHandler) }
    )
  }

  private pasteHandler = (cm: cm_t, ev: ClipboardEvent) => {
    var cd: DataTransfer = ev.clipboardData || window['clipboardData']
    var convertor = this.convertor

    if (!convertor || !cd || cd.types.indexOf('text/html') == -1) return
    var result = convertor(cd.getData('text/html'))
    if (!result) return

    cm.operation(cm.replaceSelection.bind(cm, result))

    ev.preventDefault()
  }
}


declare global { namespace HyperMD { interface HelperCollection { [AddonAlias]?: Paste } } }

/** ADDON GETTER: Only one addon instance allowed in a editor */
export const getAddon = Addon.Getter(AddonAlias, Paste)
