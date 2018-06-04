// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
//
// POWERPACK for "addon/paste"
//
// Turndown is an excellent HTML-to-Markdown library
// Give it a try!
//

/// <reference path="./typings/turndown.d.ts" />

import * as TurndownService from "turndown"
import { PasteConvertor, suggestedOption, defaultOption } from "../addon/paste"

export const TurndownConvertor: PasteConvertor =
  (html) => {
    // strip <a> without href
    html = html.replace(/<a([^>]*)>(.*?)<\/a>/ig, (s, attrs, content) => {
      if (!/href=/i.test(attrs)) return content
      return s
    })

    // maybe you don't need to convert, if there is no img/link/header...
    if (!/\<(?:(?:hr|img)|\/(?:h\d|strong|em|strikethrough|table|a|b|i|del)\>)/i.test(html)) return null

    const turndownService = getTurndownService()
    if (turndownService) return turndownService.turndown(html)

    return null
  }

export const getTurndownService = (function () {
  var service: TurndownService = null

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

if (typeof TurndownService != "undefined") {
  // Use this convertor as default convertor
  defaultOption.convertor = TurndownConvertor
} else {
  console.error("[HyperMD] PowerPack paste-with-turndown loaded, but turndown not found.")
}
