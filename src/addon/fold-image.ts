// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
//
// DESCRIPTION: Fold Image Markers `![](xxx)`
//

import { FolderFunc, registerFolder, RequestRangeResult, breakMark } from "./fold";
import { Position } from "codemirror";
import { splitLink } from "./read-link";

const DEBUG = false

export const ImageFolder: FolderFunc = function (stream, token) {
  const cm = stream.cm
  const imgRE = /\bimage-marker\b/
  const urlRE = /\bformatting-link-string\b/   // matches the parentheses
  if (imgRE.test(token.type) && token.string === "!") {
    var lineNo = stream.lineNo

    // find the begin and end of url part
    var url_begin = stream.findNext(urlRE)
    var url_end = stream.findNext(urlRE, url_begin.i_token + 1)

    let from: Position = { line: lineNo, ch: token.start }
    let to: Position = { line: lineNo, ch: url_end.token.end }
    let rngReq = stream.requestRange(from, to, from, from)

    if (rngReq === RequestRangeResult.OK) {
      var url: string
      var title: string

      { // extract the URL
        let rawurl = cm.getRange(    // get the URL or footnote name in the parentheses
          { line: lineNo, ch: url_begin.token.start + 1 },
          { line: lineNo, ch: url_end.token.start }
        )
        if (url_end.token.string === "]") {
          let tmp = cm.hmdReadLink(rawurl, lineNo)
          if (!tmp) return null // Yup! bad URL?!
          rawurl = tmp.content
        }
        url = splitLink(rawurl).url
        url = cm.hmdResolveURL(url)
      }

      { // extract the title
        title = cm.getRange(
          { line: lineNo, ch: from.ch + 2 },
          { line: lineNo, ch: url_begin.token.start - 1 }
        )
      }

      var img = document.createElement("img")
      var marker = cm.markText(
        from, to,
        {
          clearOnEnter: true,
          collapsed: true,
          replacedWith: img,
        }
      )

      img.addEventListener('load', () => {
        img.classList.remove("hmd-image-loading")
        marker.changed()
      }, false)
      img.addEventListener('error', () => {
        img.classList.remove("hmd-image-loading")
        img.classList.add("hmd-image-error")
        marker.changed()
      }, false)
      img.addEventListener('click', () => breakMark(cm, marker), false)

      img.className = "hmd-image hmd-image-loading"
      img.src = url
      img.title = title
      return marker
    } else {
      if (DEBUG) {
        console.log("[image]FAILED TO REQUEST RANGE: ", rngReq)
      }
    }
  }

  return null
}

registerFolder("image", ImageFolder, true)
