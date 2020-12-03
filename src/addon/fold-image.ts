// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
//
// DESCRIPTION: Fold Image Markers `![](xxx)`
//

import {
  FolderFunc,
  registerFolder,
  RequestRangeResult,
  breakMark,
} from "./fold";
import { Position } from "codemirror";
import * as CodeMirror from "codemirror";

const DEBUG = false;

export function splitImageLink(content: string) {
  // remove title part (if exists)
  content = content.trim();
  var url = content,
    caption = "",
    caption_or_size = "",
    width = "",
    height = "";
  var mat = content.match(/^(\S+)\s+("(?:[^"\\]+|\\.)+"|[^"\s].*)$/);
  if (mat) {
    url = mat[1];
    caption_or_size = mat[2];
    var mat2 = caption_or_size.match(/^(?:(.*)\s)?(\d*)x(\d*)(?:\s(.*))?$/);
    if (mat2) {
      caption = mat2[1] || "";
      width = mat2[2];
      height = mat2[3];
      if (mat2[4] != null) {
        caption = mat2[4]
      } 
    } else {
      caption = caption_or_size;
    }
    if (caption.charAt(0) === '"') {
      caption = caption.substr(1, caption.length - 2).replace(/\\"/g, '"');
    }
  }

  return { url, caption, width, height };
}

export const ImageFolder: FolderFunc = function (stream, token) {
  const cm = stream.cm;
  const imgRE = /\bimage-marker\b/;
  const urlRE = /\bformatting-link-string\b/; // matches the parentheses
  if (imgRE.test(token.type) && token.string === "!") {
    var lineNo = stream.lineNo;

    // find the begin and end of url part
    var url_begin = stream.findNext(urlRE);
    if (!url_begin) {
      return null;
    }
    var url_end = stream.findNext(urlRE, url_begin.i_token + 1);

    let from: Position = { line: lineNo, ch: token.start };
    let to: Position = { line: lineNo, ch: url_end.token.end };
    let rngReq = stream.requestRange(from, to, from, from);

    if (rngReq === RequestRangeResult.OK) {
      let url: string;
      let alt: string;
      let caption: string;
      let width: string;
      let height: string;

      {
        // extract the URL
        let rawurl = cm.getRange(
          // get the URL or footnote name in the parentheses
          { line: lineNo, ch: url_begin.token.start + 1 },
          { line: lineNo, ch: url_end.token.start }
        );
        if (url_end.token.string === "]") {
          let tmp = cm.hmdReadLink(rawurl, lineNo);
          if (!tmp) return null; // Yup! bad URL?!
          rawurl = tmp.content;
        }
        const split = splitImageLink(rawurl);
        url = split.url;
        caption = split.caption;
        width = split.width;
        height = split.height;
        url = cm.hmdResolveURL(url);
      }

      {
        // extract the alt
        alt = cm.getRange(
          { line: lineNo, ch: from.ch + 2 },
          { line: lineNo, ch: url_begin.token.start - 1 }
        );
      }

      var baseEl = document.createElement("figure");
      var img = document.createElement("img");
      baseEl.append(img);
      if (caption != "") {
        var captionEl = document.createElement("figcaption");
        captionEl.innerText = caption;
        baseEl.append(captionEl);
      }
      var marker = cm.markText(from, to, {
        clearOnEnter: true,
        collapsed: true,
        replacedWith: baseEl,
        inclusiveLeft: true,
        inclusiveRight: true,
      });

      img.addEventListener(
        "load",
        () => {
          img.classList.remove("hmd-image-loading");
          marker.changed();
        },
        false
      );
      img.addEventListener(
        "error",
        () => {
          img.classList.remove("hmd-image-loading");
          img.classList.add("hmd-image-error");
          marker.changed();
        },
        false
      );

      img.className = "hmd-image hmd-image-loading";

      // Yiyi: Disable unsafe http URL
      if (url.match(/^http:\/\//)) {
        url = "";
        caption = "";
        alt = "URLをhttpからhttpsに修正してください";
      }

      img.addEventListener("click", () =>{
         breakMark(cm, marker)
      });

      img.alt = alt;
      if (width !== "")
        img.setAttribute("width", width);
      if (height !== "")
        img.setAttribute("height", height);
      img.setAttribute("src", url);
      return marker;
    } else {
      if (DEBUG && window["VICKYMD_DEBUG"]) {
        console.log("[image]FAILED TO REQUEST RANGE: ", rngReq);
      }
    }
  }

  return null;
};

registerFolder("image", ImageFolder, true);
