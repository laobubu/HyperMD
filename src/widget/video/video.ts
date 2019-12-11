// 0xGG Team
// Distributed under AGPL3
//
// DESCRIPTION: This widget creates <video> html element

import { Attributes } from "../../addon/fold";
import { ErrorWidget } from "../error/error";

export function VideoWidget(attributes: Attributes) {
  const id = "_widget_video_id_" + Math.round(1e9 * Math.random()).toString(36);
  const videoWrapper = document.createElement("div");
  videoWrapper.id = id;
  videoWrapper.style.position = "relative";
  videoWrapper.style.width = "100%";
  videoWrapper.style.height = "0";
  videoWrapper.style.paddingTop = "56.25%";

  const video = document.createElement("video");
  video.innerText = "Your browser does not support the video tag.";
  const src = attributes["src"];
  if (!src) {
    return ErrorWidget({ message: "Field 'src' is missing" });
  }
  if (attributes["autoplay"]) {
    video.setAttribute("autoplay", attributes["autoplay"]);
  }
  if (attributes["controls"]) {
    video.setAttribute("controls", attributes["controls"]);
  }
  if (attributes["loop"]) {
    video.setAttribute("loop", attributes["loop"]);
  }
  if (attributes["muted"]) {
    video.setAttribute("muted", attributes["muted"]);
  }
  if (attributes["poster"]) {
    video.setAttribute("poster", attributes["poster"]);
  }
  if (attributes["style"]) {
    video.setAttribute("style", attributes["style"]);
  }

  video.style.position = "absolute";
  video.style.left = "0";
  video.style.top = "0";
  video.style.width = "100%";
  video.style.height = "100%";

  const source = document.createElement("source");
  source.setAttribute("src", src);
  const type = attributes["type"];
  if (type) {
    source.setAttribute("type", type);
  }
  video.appendChild(source);
  videoWrapper.appendChild(video);
  return videoWrapper;
}
