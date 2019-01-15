// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
//
// DESCRIPTION: Fold URL of links `[text](url)`
//

import { FolderFunc, registerFolder, RequestRangeResult, breakMark } from "./fold";
import { Position } from "codemirror";
import { splitLink } from "./read-link";
import { getLineSpanExtractor, Span } from "../core/line-spans";

const DEBUG = false

export const LinkFolder: FolderFunc = function (stream, token) {
  const cm = stream.cm

  // a valid beginning must be ...
  if (!(
    token.string === '[' &&   // the leading [
    token.state.linkText &&   // (double check) is link text
    !token.state.linkTitle &&   // (double check) not image's title
    !/\bimage\b/.test(token.type)  // and is not a image mark
  )) return null

  let spanExtractor = getLineSpanExtractor(cm)
  let tmpSpans: Span[]

  // first, find the link text span

  let linkTextSpan = spanExtractor.findSpanWithTypeAt({ line: stream.lineNo, ch: token.start }, "linkText")
  if (!linkTextSpan) return null

  // then find the link href span

  let linkHrefSpan = spanExtractor.findSpanWithTypeAt({ line: stream.lineNo, ch: linkTextSpan.end + 1 }, "linkHref")
  if (!linkHrefSpan) return null

  // now compose the ranges

  const href_from: Position = { line: stream.lineNo, ch: linkHrefSpan.begin }
  const href_to: Position = { line: stream.lineNo, ch: linkHrefSpan.end }
  const link_from: Position = { line: stream.lineNo, ch: linkTextSpan.begin }
  const link_to: Position = href_to

  // and check if the range is OK
  const rngReq = stream.requestRange(href_from, href_to, link_from, href_from)
  if (rngReq !== RequestRangeResult.OK) return null

  // everything is OK! make the widget
  var text = cm.getRange(href_from, href_to)
  var { url, title } = splitLink(text.substr(1, text.length - 2))

  var img = document.createElement("span")
  img.setAttribute("class", "hmd-link-icon")
  img.setAttribute("title", url + "\n" + title)
  img.setAttribute("data-url", url)

  var marker = cm.markText(
    href_from, href_to,
    {
      collapsed: true,
      replacedWith: img,
    }
  )

  img.addEventListener('click', () => breakMark(cm, marker), false)
  return marker
}

registerFolder("link", LinkFolder, true)
