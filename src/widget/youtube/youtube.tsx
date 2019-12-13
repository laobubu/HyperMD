// 0xGG Team
// Distributed under AGPL3
//
// DESCRIPTION: This widget embeds Youtube video

import { WidgetCreator } from "..";
import { Attributes } from "../../addon/fold";
import React from "react";
import ReactDOM from "react-dom";
import { Widget } from "../component/widget";
import { ErrorWidget } from "../error/error";

interface Props {
  attributes: Attributes;
  isPreview: boolean;
}
function Youtube(props: Props) {
  const attributes = props.attributes;
  return (
    <div
      style={{
        cursor: "default",
        position: "relative",
        width: "100%",
        height: "0",
        paddingTop: "56.25%"
      }}
    >
      <iframe
        style={{
          backgroundColor: "#ddd",
          border: "none",
          position: "absolute",
          left: "0",
          top: "0",
          width: "100%",
          height: "100%"
        }}
        src={`https://www.youtube.com/embed/${attributes["v"]}`}
        scrolling={"no"}
        frameBorder={"no"}
        allowFullScreen={true}
      ></iframe>
    </div>
  );
}

export const YoutubeWidget: WidgetCreator = args => {
  const el = document.createElement("span");
  if (!args.attributes["v"]) {
    return ErrorWidget({
      ...args,
      ...{
        attributes: { message: "Field 'v' is missing" }
      }
    });
  }
  ReactDOM.render(
    <Widget>
      <Youtube
        attributes={args.attributes}
        isPreview={args.isPreview}
      ></Youtube>
    </Widget>,
    el
  );
  return el;
};
