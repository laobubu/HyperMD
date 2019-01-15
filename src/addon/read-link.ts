// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
//
// DESCRIPTION: Fetch footnote content, Resolve relative URLs
//

import * as CodeMirror from 'codemirror'
import { Addon, debounce, suggestedEditorConfig } from '../core'
import { cm_t } from '../core/type'


/********************************************************************************** */

export interface Link {
  line: number
  content: string
}
export type CacheDB = { [lowerTrimmedKey: string]: Link[] }

/**
 * Normalize a (potentially-with-title) URL string
 *
 * @param content eg. `http://laobubu.net/page "The Page"` or just a URL
 */
export function splitLink(content: string) {
  // remove title part (if exists)
  content = content.trim()
  var url = content, title = ""
  var mat = content.match(/^(\S+)\s+("(?:[^"\\]+|\\.)+"|[^"\s].*)/)
  if (mat) {
    url = mat[1]
    title = mat[2]
    if (title.charAt(0) === '"') title = title.substr(1, title.length - 2).replace(/\\"/g, '"')
  }

  return { url, title }
}

/********************************************************************************** */
//#region CodeMirror Extension
// add methods to all CodeMirror editors

// every codemirror editor will have these member methods:
export const Extensions = {
  /**
   * Try to find a footnote and return its lineNo, content.
   *
   * NOTE: You will need `hmdSplitLink` and `hmdResolveURL` if you want to get a URL
   *
   * @param footNoteName without square brackets, case-insensive
   * @param line since which line
   */
  hmdReadLink(this: cm_t, footNoteName: string, line?: number) {
    return getAddon(this).read(footNoteName, line)
  },

  /**
   * Check if URL is relative URL, and add baseURI if needed; or if it's a email address, add "mailto:"
   *
   * @see ReadLink.resolve
   */
  hmdResolveURL(this: cm_t, url: string, baseURI?: string) {
    return getAddon(this).resolve(url, baseURI)
  },

  hmdSplitLink: splitLink,
}

export type ExtensionsType = typeof Extensions
declare global { namespace HyperMD { interface Editor extends ExtensionsType { } } }

for (var name in Extensions) {
  CodeMirror.defineExtension(name, Extensions[name])
}

//#endregion

/********************************************************************************** */
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

/********************************************************************************** */
//#region Addon Class

export class ReadLink implements Addon.Addon, Options {
  baseURI: string

  cache: CacheDB = {}

  constructor(
    public cm: cm_t
  ) {
    cm.on("changes", debounce(() => this.rescan(), 500))
    this.rescan()
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
  read(footNoteName: string, line?: number): (Link | void) {
    var defs = this.cache[footNoteName.trim().toLowerCase()] || []
    var def: Link

    if (typeof line !== "number") line = 1e9
    for (var i = 0; i < defs.length; i++) {
      def = defs[i]
      if (def.line > line) break
    }

    return def
  }

  /**
   * Scan content and rebuild the cache
   */
  rescan() {
    const cm = this.cm
    var cache: CacheDB = (this.cache = {})
    cm.eachLine((line) => {
      var txt = line.text, mat = /^(?:>\s+)*>?\s{0,3}\[([^\]]+)\]:\s*(.+)$/.exec(txt)
      if (mat) {
        var key = mat[1].trim().toLowerCase(), content = mat[2]
        if (!cache[key]) cache[key] = []
        cache[key].push({
          line: line.lineNo(),
          content: content,
        })
      }
    })
  }

  /**
   * Check if URL is relative URL, and add baseURI if needed
   *
   * @example
   *
   *     resolve("<email address>") // => "mailto:xxxxxxx"
   *     resolve("../world.png") // => (depends on your editor configuration)
   *     resolve("../world.png", "http://laobubu.net/xxx/foo/") // => "http://laobubu.net/xxx/world.png"
   *     resolve("../world.png", "http://laobubu.net/xxx/foo") // => "http://laobubu.net/xxx/world.png"
   *     resolve("/world.png", "http://laobubu.net/xxx/foo/") // => "http://laobubu.net/world.png"
   */
  resolve(uri: string, baseURI?: string) {
    const emailRE = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/

    const hostExtract = /^(?:[\w-]+\:\/*|\/\/)[^\/]+/
    const levelupRE = /\/[^\/]+(?:\/+\.?)*$/

    if (!uri) return uri
    if (emailRE.test(uri)) return "mailto:" + uri

    var tmp: RegExpMatchArray
    var host = ""

    baseURI = baseURI || this.baseURI

    // not configured, or is already URI with scheme
    if (!baseURI || hostExtract.test(uri)) return uri

    // try to extract scheme+host like http://laobubu.net without tailing slash
    if (tmp = baseURI.match(hostExtract)) {
      host = tmp[0];
      baseURI = baseURI.slice(host.length)
    }

    while (tmp = uri.match(/^(\.{1,2})([\/\\]+)/)) {
      uri = uri.slice(tmp[0].length)
      if (tmp[1] == "..") baseURI = baseURI.replace(levelupRE, "")
    }

    if (uri.charAt(0) === '/' && host) {
      uri = host + uri
    } else {
      if (!/\/$/.test(baseURI)) baseURI += "/"
      uri = host + baseURI + uri
    }

    return uri
  }
}

//#endregion

/** ADDON GETTER (Singleton Pattern): a editor can have only one ReadLink instance */
export const getAddon = Addon.Getter("ReadLink", ReadLink, defaultOption /** if has options */)
declare global { namespace HyperMD { interface HelperCollection { ReadLink?: ReadLink } } }
