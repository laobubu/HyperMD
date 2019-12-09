import { Attributes } from "../addon/fold";
import { ErrorWidget } from "./error";

export function BilibiliWidget(attributes: Attributes) {
  const el = document.createElement("iframe");
  const aid = attributes["aid"];
  if (!aid) {
    return ErrorWidget({ message: "Attribute `aid` is required" });
  }
  el.style.backgroundColor = "#ddd";
  el.src = `https://player.bilibili.com/player.html?aid=${aid}`;
  el.scrolling = "no";
  el.frameBorder = "no";
  el.setAttribute("border", "0");
  el.setAttribute("framespacing", "0");
  el.setAttribute("allowfullscreen", "true");
  return el;
}
