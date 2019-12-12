// 0xGG Team
// Distributed under AGPL3
//
// DESCRIPTION: This widget creates <video> html element
import { WidgetCreator } from "..";
import { Attributes } from "../../addon/fold";
import React from "react";
import ReactDOM from "react-dom";
import { Widget } from "../component/widget";
import { ErrorWidget } from "../error/error";

interface Props {
  attributes: Attributes;
}
function Video(props: Props) {
  const attributes = props.attributes;
  return (
    <div
      style={Object.assign(
        {
          position: "relative",
          width: "100%",
          height: "0",
          paddingTop: "56.25%"
        },
        attributes["style"] || {}
      )}
    >
      <video
        autoPlay={attributes["autoplay"] || attributes["autoPlay"]}
        controls={attributes["controls"]}
        loop={attributes["loop"]}
        muted={attributes["muted"]}
        poster={attributes["poster"]}
        style={{
          position: "absolute",
          left: "0",
          top: "0",
          width: "100%",
          height: "100%"
        }}
      >
        <source src={attributes["src"]} type={attributes["type"]}></source>
      </video>
      Your browser does not support the video element.
    </div>
  );
}

export const VideoWidget: WidgetCreator = args => {
  const el = document.createElement("span");
  if (!args.attributes["src"]) {
    return ErrorWidget({ ...args, ...{ message: "Field 'src' is missing" } });
  }
  ReactDOM.render(
    <Widget>
      <Video attributes={args.attributes}></Video>
    </Widget>,
    el
  );
  return el;
};
