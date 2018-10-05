// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
//
// DESCRIPTION: Fold URL of links `[text](url)`
//

import { FolderFunc, registerFolder, RequestRangeResult, breakMark } from "./fold";
import { Position } from "codemirror";
import { splitLink } from "./read-link";

const DEBUG = false

export const LinkFolder: FolderFunc = function (stream, token) {
  const cm = stream.cm

  // a valid beginning must be ...
  if (!(
    token.string === '[' &&   // the leading [
    token.state.linkText &&   // (double check)
    !/\bimage\b/.test(token.type)  // and is not a image mark
  )) return null

  // first, find the left parentheses of URL (aka. href)
  var url_begin = stream.findNext((token, tokens, idx) => {
    if (token.string !== '(' || !token.state.linkHref) return false
    if (idx > 0 && /\bimage\b/.test(tokens[idx - 1].type)) return false
    return true
  }, /* maySpanLines = */ true)
  if (!url_begin) return null

  // then, find the right parentheses of URL (aka. href)
  var url_end = stream.findNext(token => !token.state.linkHref, url_begin.i_token)
  if (!url_end || url_end.token.string !== ')') return null

  // now we get keypoints
  const href_from: Position = { line: url_begin.lineNo, ch: url_begin.token.start }
  const href_to: Position = { line: url_end.lineNo, ch: url_end.token.end }
  const link_from: Position = { line: stream.lineNo, ch: token.start }
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
