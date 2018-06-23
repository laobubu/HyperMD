// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
//
// POWERPACK for "addon/fold-emoji"
//
// Use [twemoji](https://github.com/twitter/twemoji) to render emoji `:smile:` :smile:
//
// :warning: **License**:
//
// Please follow https://github.com/twitter/twemoji#license if you use this powerpack.
// 使用前请注意阅读 twemoji 使用许可
//

import * as _twemoji_module from 'twemoji'
import { defaultOption, defaultChecker, defaultRenderer, EmojiRenderer, defaultDict, EmojiChecker } from '../addon/fold-emoji'

/** twemoji */
var twemoji: typeof _twemoji_module = _twemoji_module || this['twemoji'] || window['twemoji']

var twemojiOptions = null

/** set the 2nd argument of `twemoji.parse()` */
export function setOptions(options?: object | Function) {
  twemojiOptions = options
}

export const twemojiChecker: EmojiChecker = defaultChecker

export const twemojiRenderer: EmojiRenderer = (text) => {
  var emojiStr = defaultDict[text]
  var html = twemojiOptions ? twemoji.parse(emojiStr, twemojiOptions) : twemoji.parse(emojiStr)

  // If twemoji failed to render, fallback to defaultRenderer
  if (!/^<img /i.test(html)) return defaultRenderer(text);

  var attr = /([\w-]+)="(.+?)"/g
  var ans = document.createElement("img")
  var t: RegExpMatchArray
  while (t = attr.exec(html)) ans.setAttribute(t[1], t[2])
  return ans
}

// Update default EmojiChecker and EmojiRenderer
if (twemoji) {
  defaultOption.emojiChecker = twemojiChecker
  defaultOption.emojiRenderer = twemojiRenderer
} else {
  console.error("[HyperMD] PowerPack fold-emoji-with-twemoji loaded, but twemoji not found.")
}
