// 0xGG Team
// Distributed under AGPL3
//
// DESCRIPTION: This widget embeds Bilibili video

import { Attributes } from "../../addon/fold";
import { ErrorWidget } from "../error/error";

export function BilibiliWidget(attributes: Attributes) {
  const id =
    "_widget_bilibili_id_" + Math.round(1e9 * Math.random()).toString(36);
  const videoWrapper = document.createElement("div");
  videoWrapper.id = id;
  videoWrapper.style.position = "relative";
  videoWrapper.style.width = "100%";
  videoWrapper.style.height = "0";
  videoWrapper.style.paddingTop = "56.25%";

  const iframe = document.createElement("iframe");
  const aid = attributes["aid"];
  if (!aid) {
    return ErrorWidget({ message: "Attribute `aid` is required" });
  }
  iframe.style.backgroundColor = "#ddd";
  iframe.src = `https://player.bilibili.com/player.html?aid=${aid}`;
  iframe.scrolling = "no";
  iframe.frameBorder = "no";
  iframe.setAttribute("border", "0");
  iframe.setAttribute("framespacing", "0");
  iframe.setAttribute("allowfullscreen", "true");
  iframe.style.position = "absolute";
  iframe.style.left = "0";
  iframe.style.top = "0";
  iframe.style.width = "100%";
  iframe.style.height = "100%";

  videoWrapper.appendChild(iframe);
  return videoWrapper;
}
