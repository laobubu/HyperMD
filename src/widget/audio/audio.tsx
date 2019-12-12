// 0xGG Team
// Distributed under AGPL3
//
// DESCRIPTION: This widget creates <audio> html element

import { WidgetCreator } from "..";
import { Attributes } from "../../addon/fold";
import React from "react";
import ReactDOM from "react-dom";
import { Widget } from "../component/widget";
import { ErrorWidget } from "../error/error";

/*
Example:

  `@audio "src":"https://raw.githubusercontent.com/shd101wyy/PlanetWalley/master/May4/songs/%E8%80%81%E7%94%B7%E5%AD%A9.mp3","autoplay":true`

*/

interface Props {
  attributes: Attributes;
  isPreview: boolean;
}
function Audio(props: Props) {
  const attributes = props.attributes;
  return (
    <span style={{ cursor: "default" }}>
      <audio
        autoPlay={attributes["autoplay"] || attributes["autoPlay"]}
        controls={attributes["controls"]}
        loop={attributes["loop"]}
        muted={attributes["muted"]}
        style={attributes["style"]}
      >
        Your browser does not support the audio element.
        <source src={attributes["src"]} type={attributes["type"]}></source>
      </audio>
      {!props.isPreview && "🎵"}
    </span>
  );
}

export const AudioWidget: WidgetCreator = args => {
  const el = document.createElement("span");
  if (!args.attributes["src"]) {
    return ErrorWidget({
      ...args,
      ...{
        attributes: { message: "Field 'src' is missing" }
      }
    });
  }
  ReactDOM.render(
    <Widget>
      <Audio attributes={args.attributes} isPreview={args.isPreview}></Audio>
    </Widget>,
    el
  );
  return el;
};
