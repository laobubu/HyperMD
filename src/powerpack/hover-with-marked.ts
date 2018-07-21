// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
//
// POWERPACK for "addon/hover"
//
// Render tooltip Markdown to HTML, with marked
//

import { defaultOption } from "../addon/hover"
import * as marked from "marked"

if (typeof marked == "function") {
  // Use marked to render Hover tooltip content
  defaultOption.convertor = function (footnote: string, text: string) {
    if (!text) return null
    return marked(text)
  }
} else {
  console.error("[HyperMD] PowerPack hover-with-marked loaded, but marked not found.")
}
