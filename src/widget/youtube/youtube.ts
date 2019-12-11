// 0xGG Team
// Distributed under AGPL3
//
// DESCRIPTION: This widget embeds Youtube video

import { Attributes } from "../../addon/fold";
import { ErrorWidget } from "../error/error";

export function YoutubeWidget(attributes: Attributes) {
  const id =
    "_widget_youtube_id_" + Math.round(1e9 * Math.random()).toString(36);
  const videoWrapper = document.createElement("div");
  videoWrapper.id = id;
  videoWrapper.style.position = "relative";
  videoWrapper.style.width = "100%";
  videoWrapper.style.height = "0";
  videoWrapper.style.paddingTop = "56.25%";

  const iframe = document.createElement("iframe");
  const v = attributes["v"];
  if (!v) {
    return ErrorWidget({ message: "Field 'v' is missing" });
  }

  iframe.src = `https://www.youtube.com/embed/${v}`;
  iframe.setAttribute("frameborder", "0");
  iframe.setAttribute("allow", "encrypted-media");
  iframe.setAttribute("allowfullscreen", "true");
  iframe.style.position = "absolute";
  iframe.style.left = "0";
  iframe.style.top = "0";
  iframe.style.width = "100%";
  iframe.style.height = "100%";

  console.log("create youtube widget");
  videoWrapper.appendChild(iframe);
  return videoWrapper;
}
