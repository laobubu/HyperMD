// 0xGG Team
// Distributed under AGPL3
//
// DESCRIPTION: This widget displays time related information

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
function Timer(props: Props) {
  const attributes = props.attributes;
  return (
    <div
      style={{
        paddingTop: "4px 12px",
        backgroundColor: attributes["backgroundColor"] || "rgb(250, 145, 1)",
        color: attributes["color"] || "#fff",
        borderRadius: "16px",
        display: "flex",
        justifyContent: "space-between",
        width: "375px",
        maxWidth: "100%",
        boxShadow: "0 1px 3px 1px #aaa"
      }}
    >
      <div className={"widget-timer-date"}>
        {"⌚ " + new Date(attributes["date"]).toLocaleString()}
      </div>
      <div className={"widget-timer-duration"}>
        {attributes["duration"] ? "🎬 " + attributes["duration"] : ""}
      </div>
    </div>
  );
}

export const TimerWidget: WidgetCreator = args => {
  const el = document.createElement("span");
  if (!args.attributes["date"]) {
    return ErrorWidget({ ...args, ...{ message: "Field 'date' is missing" } });
  }
  ReactDOM.render(
    <Widget>
      <Timer attributes={args.attributes} isPreview={args.isPreview}></Timer>
    </Widget>,
    el
  );
  return el;
};
