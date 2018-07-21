// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
//
// POWERPACK for "addon/fold-emoji"
//
// Use EmojiOne to lookup emojis and render emoji `:smile:` :smile:
//
// :warning: **License**:
//
// Please follow https://www.emojione.com/licenses/free if you use this powerpack.
// 使用前请注意阅读 EmojiOne 使用许可
//

import * as _emojione_module from 'emojione'
import { defaultOption, EmojiChecker, EmojiRenderer } from '../addon/fold-emoji'

import 'emojione/extras/css/emojione.min.css'

/** emojione doesn't have AMD declaration. load it from browser if needed */
var emojione: typeof _emojione_module = _emojione_module || this['emojione'] || window['emojione']

export const emojioneChecker: EmojiChecker = (text) => emojione.shortnameToUnicode(text) != text;
export const emojioneRenderer: EmojiRenderer = (text) => {
  var html = emojione.shortnameToImage(text)
  if (!/^<img /i.test(html)) return null

  var attr = /([\w-]+)="(.+?)"/g
  var ans = document.createElement("img")
  var t: RegExpMatchArray
  while (t = attr.exec(html)) ans.setAttribute(t[1], t[2])
  return ans
}

// Update default EmojiChecker and EmojiRenderer
if (emojione) {
  defaultOption.emojiChecker = emojioneChecker
  defaultOption.emojiRenderer = emojioneRenderer
} else {
  console.error("[HyperMD] PowerPack fold-emoji-with-emojione loaded, but emojione not found.")
}
