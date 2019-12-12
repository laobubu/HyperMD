// 0xGG Team
// Distributed under AGPL3
//
// DESCRIPTION: The error widget that displays the error message

import { WidgetCreator } from "..";
import React from "react";
import ReactDOM from "react-dom";
import { Widget } from "../component/widget";

export const ErrorWidget: WidgetCreator = args => {
  const el = document.createElement("span");

  ReactDOM.render(
    <Widget>
      <span style={{ color: "#f50" }}>{`VickyMD widget error: ${args.attributes[
        "message"
      ] || "Unknown error"}`}</span>
    </Widget>,
    el
  );

  return el;
};
