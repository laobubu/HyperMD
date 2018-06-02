// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
//
// POWERPACK for "addon/hover"
//
// Render tooltip Markdown to HTML, with marked
//

/// <reference path="./typings/_misc.d.ts" />

import { useMarkdownRenderer } from "../addon/hover"
import * as marked from "marked"

if (typeof marked == "function") {
  useMarkdownRenderer(marked)
}
