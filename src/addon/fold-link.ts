// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
//
// DESCRIPTION: Fold URL of links `[text](url)`
//

import {
  FolderFunc,
  registerFolder,
  RequestRangeResult,
  breakMark,
} from "./fold";
import { Position } from "codemirror";
import { splitLink } from "./read-link";
import { getLineSpanExtractor, Span } from "../core";
import * as CodeMirror from "codemirror";

const DEBUG = false;

export const LinkFolder: FolderFunc = function (stream, token) {
  const cm = stream.cm;

  // a valid beginning must be ...
  if (
    !(
      (
        token.string === "[" && // the leading [
        token.state.linkText && // (double check) is link text
        !token.state.linkTitle && // (double check) not image's title
        !/\bimage\b/.test(token.type)
      ) // and is not a image mark
    )
  )
    return null;

  let spanExtractor = getLineSpanExtractor(cm);

  // first, find the link text span
  let linkTextSpan = spanExtractor.findSpanWithTypeAt(
    { line: stream.lineNo, ch: token.start },
    "linkText"
  );
  if (!linkTextSpan) return null;

  // then find the link href span
  let linkHrefSpan = spanExtractor.findSpanWithTypeAt(
    { line: stream.lineNo, ch: linkTextSpan.end + 1 },
    "linkHref"
  );
  if (!linkHrefSpan) return null;

  // now compose the ranges

  const hrefFrom: Position = { line: stream.lineNo, ch: linkHrefSpan.begin };
  const hrefTo: Position = { line: stream.lineNo, ch: linkHrefSpan.end };
  const linkFrom: Position = { line: stream.lineNo, ch: linkTextSpan.begin };
  // const linkTo: Position = { line: stream.lineNo, ch: linkTextSpan.end };

  // and check if the range is OK
  const rngReq = stream.requestRange(hrefFrom, hrefTo, linkFrom, hrefFrom);
  if (rngReq !== RequestRangeResult.OK) return null;

  // everything is OK! make the widget
  const text = cm.getRange(hrefFrom, hrefTo);
  const { url, title } = splitLink(text.substr(1, text.length - 2));

  const marker = cm.markText(hrefFrom, hrefTo, {
    collapsed: true,
  });

  return marker;
};

registerFolder("link", LinkFolder, true);
