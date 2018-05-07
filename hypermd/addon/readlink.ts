// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
//
// trace the footnote, finding the url
//

import CodeMirror from 'codemirror'
import { Addon, debounce } from '../core'
import { cm_t } from '../core/type'

interface Link {
  line: number
  content: string
}
type CacheDB = { [lowerTrimmedKey: string]: Link[] }

class ReadLink implements Addon.Addon {
  public cache: CacheDB = {}

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
}

export { ReadLink }

/** HYPERMD ADDON DECLARATION */

const AddonAlias = "readLink"
const AddonClassCtor = ReadLink
type AddonClass = ReadLink

declare global {
  namespace HyperMD {
    interface HelperCollection { [AddonAlias]?: AddonClass }
  }
}

export const getAddon = Addon.Getter(AddonAlias, AddonClassCtor)

/** HYPERMD HELPER DECLARATION */

const HelperName = "hmdReadLink"
const HelperObject = function (this: cm_t, footNoteName: string, line?: number) {
  return getAddon(this).read(footNoteName, line)
}

declare global {
  namespace HyperMD {
    interface Editor { [HelperName]: typeof HelperObject }
  }
}
CodeMirror.defineExtension(HelperName, HelperObject)
