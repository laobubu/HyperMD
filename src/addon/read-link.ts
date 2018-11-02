// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
//
// DESCRIPTION: Fetch footnote content, Resolve relative URLs
//

import * as CodeMirror from 'codemirror'
import * as Addon from '../core/addon'
import { suggestedEditorConfig } from '../core/defaults'
import { resolveURI, splitLink } from '../core/utils'
import { getAddon as getDocInfo, Footnote } from "./doc-info"

import { cm_t } from '../core/type'

export { Footnote }

//-------------------------------------------------------
//#region CodeMirror Extension
// add methods to all CodeMirror editors

// every codemirror editor will have these member methods:
export const Extensions = {
  /**
   * Try to find a footnote and return its lineNo, content.
   *
   * @see hmdReadFootnoteLink -- if you want a URL instead of full footnote line
   *
   * @param footNoteName without square brackets, case-insensive
   * @param line since which line
   */
  hmdReadFootnote(this: cm_t, footNoteName: string, line?: number) {
    return getAddon(this).readFootnote(footNoteName, line)
  },

  /**
   * Try to find a footnote, and resolve the relative URL.
   *
   * @see hmdReadFootnote -- if you just want the plain footnote line
   *
   * @param footNoteName without square brackets, case-insensive
   * @param line since which line
   */
  hmdReadLink(footNoteName: string, line?: number | boolean, resolve?: boolean): { url: string, title: string } {
    return getAddon(this).readLink(footNoteName, line as number, resolve)
  },

  /**
   * Check if URL is relative URL, and add baseURI if needed; or if it's a email address, add "mailto:"
   *
   * @see ReadLink.resolve
   */
  hmdResolveURL(this: cm_t, url: string, baseURI?: string) {
    return getAddon(this).resolve(url, baseURI)
  },
}

export type ExtensionsType = typeof Extensions
declare global {
  namespace HyperMD {
    interface Editor {
      hmdReadLink(footNoteName: string, resolve?: boolean): { url: string, title: string }
      hmdReadLink(footNoteName: string, line?: number, resolve?: boolean): { url: string, title: string }
    }
    interface Editor extends ExtensionsType { }
  }
}

for (var name in Extensions) {
  CodeMirror.defineExtension(name, Extensions[name])
}

//#endregion

//-------------------------------------------------------
//#region Addon Options

export interface Options extends Addon.AddonOptions {
  /**
   * BaseURI (without filename) used to resolve relative URLs
   * If not empty, this will affect `editor.hmdResolveURL("./relative/url")`
   *
   * @example "https://laobubu.net/HyperMD/docs/zh-CN/"
   */
  baseURI: string
}

export const defaultOption: Options = {
  baseURI: "",
}

export const suggestedOption: Partial<Options> = {
  baseURI: "",
}

export type OptionValueType = Partial<Options> | string;

declare global {
  namespace HyperMD {
    interface EditorConfiguration {
      /**
       * If not empty, this will affect `editor.hmdResolveURL()` if the URL of result is relative.
       *
       * Also affects other addons, eg. opening links, showing images...
       */
      hmdReadLink?: OptionValueType
    }
  }
}

suggestedEditorConfig.hmdReadLink = suggestedOption

CodeMirror.defineOption("hmdReadLink", defaultOption, function (cm: cm_t, newVal: OptionValueType) {

  ///// convert newVal's type to `Partial<Options>`, if it is not.

  if (!newVal || typeof newVal === "string") {
    newVal = { baseURI: newVal as string }
  }

  ///// apply config and write new values into cm

  var inst = getAddon(cm)
  for (var k in defaultOption) {
    inst[k] = (k in newVal) ? newVal[k] : defaultOption[k]
  }
})

//#endregion

//-------------------------------------------------------
//#region Addon Class

export class ReadLink implements Addon.Addon, Options {
  baseURI: string

  constructor(
    public cm: cm_t
  ) {
  }

  /**
   * get link footnote content like
   *
   * ```markdown
   *  [icon]: http://laobubu.net/icon.png
   * ```
   *
   * @param footNoteName case-insensive name, without "[" or "]"
   * @param line         current line. if not set, the first definition will be returned
   */
  readFootnote(footNoteName: string, line?: number) {
    var defs = getDocInfo(this.cm).footnoteDict[footNoteName.trim().toLowerCase()]
    if (!defs || !defs.length) return null

    if (typeof line === "number") {
      for (var i = 0; i < defs.length; i++) {
        if (defs[i].lineNo > line) return defs[i] // found first footnote after current line
      }
      return defs[0]
    }

    return defs[defs.length - 1]
  }

  /**
   * get a url defined via footnote
   *
   * @param footNoteName case-insensive name, without "[" or "]"
   * @param line         current line. if not set, the first definition will be returned
   */
  readLink(footNoteName: string, resolve?: boolean): { url: string, title: string }
  readLink(footNoteName: string, line?: number, resolve?: boolean): { url: string, title: string }
  readLink(footNoteName: string, line?: number | boolean, resolve?: boolean): { url: string, title: string } {
    let ln = this.readFootnote(footNoteName, typeof line === 'number' ? line : undefined)
    if (!ln) return null

    let ans = splitLink(ln.text)
    if (resolve) ans.url = this.resolve(ans.url)
    return ans
  }

  resolve(uri: string, baseURI?: string) {
    return resolveURI(uri, baseURI || this.baseURI)
  }
}

//#endregion

/** ADDON GETTER (Singleton Pattern): a editor can have only one ReadLink instance */
export const getAddon = Addon.makeGetter("ReadLink", ReadLink, defaultOption /** if has options */)
declare global { namespace HyperMD { interface HelperCollection { ReadLink?: ReadLink } } }
