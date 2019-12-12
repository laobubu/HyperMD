// 0xGG Team
// Distributed under AGPL3
//
// DESCRIPTION: This widget embeds Bilibili video

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
function Bilibili(props: Props) {
  const attributes = props.attributes;
  return (
    <div
      style={{
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
        src={`https://player.bilibili.com/player.html?aid=${attributes["aid"]}`}
        scrolling={"no"}
        frameBorder={"no"}
        allowFullScreen={true}
      ></iframe>
    </div>
  );
}

export const BilibiliWidget: WidgetCreator = args => {
  const el = document.createElement("span");
  if (!args.attributes["aid"]) {
    return ErrorWidget({ ...args, ...{ message: "Field 'aid' is missing" } });
  }
  ReactDOM.render(
    <Widget>
      <Bilibili
        attributes={args.attributes}
        isPreview={args.isPreview}
      ></Bilibili>
    </Widget>,
    el
  );
  return el;
};
