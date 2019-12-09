import { Attributes } from "../../addon/fold";
import { ErrorWidget } from "../error/error";

export function AudioWidget(attributes: Attributes) {
  const id = "_widget_audio_id_" + Math.round(1e9 * Math.random()).toString(36);
  const audio = document.createElement("audio");
  audio.id = id;
  audio.innerText = "Your browser does not support the audio element.";
  const src = attributes["src"];
  if (!src) {
    return ErrorWidget({ message: "Field 'src' is missing" });
  }
  if (attributes["autoplay"]) {
    audio.setAttribute("autoplay", attributes["autoplay"]);
  }
  if (attributes["controls"]) {
    audio.setAttribute("controls", attributes["controls"]);
  }
  if (attributes["loop"]) {
    audio.setAttribute("loop", attributes["loop"]);
  }
  if (attributes["muted"]) {
    audio.setAttribute("muted", attributes["muted"]);
  }
  if (attributes["style"]) {
    audio.setAttribute("style", attributes["style"]);
  }

  audio.style.position = "absolute";
  audio.style.left = "0";
  audio.style.top = "0";
  audio.style.width = "100%";
  audio.style.height = "100%";

  const source = document.createElement("source");
  source.setAttribute("src", src);
  const type = attributes["type"];
  if (type) {
    source.setAttribute("type", type);
  }
  audio.appendChild(source);
  return audio;
}
