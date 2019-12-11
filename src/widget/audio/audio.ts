// 0xGG Team
// Distributed under AGPL3
//
// DESCRIPTION: This widget creates <audio> html element

import { Attributes } from "../../addon/fold";
import { ErrorWidget } from "../error/error";

export function AudioWidget(attributes: Attributes, displayIcon = true) {
  const id = "_widget_audio_id_" + Math.round(1e9 * Math.random()).toString(36);
  const audioWrapper = document.createElement("span");
  audioWrapper.id = id;

  const audio = document.createElement("audio");
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

  const source = document.createElement("source");
  source.setAttribute("src", src);
  const type = attributes["type"];
  if (type) {
    source.setAttribute("type", type);
  }

  audio.appendChild(source);
  audioWrapper.appendChild(audio);

  if (displayIcon && !attributes["controls"]) {
    // TODO: Hover display src
    const audioIcon = document.createElement("span");
    audioIcon.classList.add("widget-audio-icon");
    audioIcon.innerText = "🎵";
    audioWrapper.appendChild(audioIcon);
  }

  return audioWrapper;
}

/*
Example:

  `@audio "src":"https://raw.githubusercontent.com/shd101wyy/PlanetWalley/master/May4/songs/%E8%80%81%E7%94%B7%E5%AD%A9.mp3","autoplay":true`

*/
