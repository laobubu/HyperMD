// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
//
// DESCRIPTION: Convert content to Markdown before pasting
//

import * as CodeMirror from 'codemirror'
import { Addon, FlipFlop, suggestedEditorConfig } from '../core'
import { cm_t } from '../core/type'

/********************************************************************************** */

export type PasteConvertor = (html: string) => string | void

/********************************************************************************** */
//#region Addon Options

export interface Options extends Addon.AddonOptions {
  /** Enable Paste feature or not. */
  enabled: boolean

  /** a function which accepts HTML, returning markdown text. */
  convertor: PasteConvertor
}

export const defaultOption: Options = {
  enabled: false,
  convertor: null,
}

export const suggestedOption: Partial<Options> = {
  enabled: true,
}

export type OptionValueType = Partial<Options> | boolean | PasteConvertor;

declare global {
  namespace HyperMD {
    interface EditorConfiguration {
      /**
       * Options for Paste.
       *
       * You may set a `PasteConvertor` function which accepts HTML, returning markdown text. Or set to `null` to disable this feature
       *
       * @see PasteConvertor
       */
      hmdPaste?: OptionValueType
    }
  }
}

suggestedEditorConfig.hmdPaste = suggestedOption

CodeMirror.defineOption("hmdPaste", defaultOption, function (cm: cm_t, newVal: OptionValueType) {

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

export class Paste implements Addon.Addon, Options /* if needed */ {
  enabled: boolean;
  convertor: PasteConvertor;

  constructor(public cm: cm_t) {
    new FlipFlop(
      /* ON  */() => { cm.on('paste', this.pasteHandler) },
      /* OFF */() => { cm.off('paste', this.pasteHandler) }
    ).bind(this, "enabled", true)
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

//#endregion

/** ADDON GETTER (Singleton Pattern): a editor can have only one Paste instance */
export const getAddon = Addon.Getter("Paste", Paste, defaultOption /** if has options */)
declare global { namespace HyperMD { interface HelperCollection { Paste?: Paste } } }
