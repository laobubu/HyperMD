// 0xGG Team
// Distributed under AGPL3
//
// DESCRIPTION: This widget tries to build a widget using react

import { Attributes } from "../../addon/fold";
import React, { useState } from "react";
import ReactDOM from "react-dom";
import { Widget } from "../component/widget";
import { WidgetCreator, WidgetArgs } from "..";

function Hello(props: WidgetArgs) {
  const [value, setValue] = useState<string>(props.attributes.value || "");
  return (
    <div
      style={{
        cursor: "default",
        padding: "24px",
        boxShadow: "0 1px 6px 2px #ddd",
      }}
    >
      <span>
        Hello, world! I am <b>{value || "VickyMD"}</b>
      </span>
      <br></br>
      <input
        style={{ zIndex: 9999 }}
        placeholder={"Enter your name here"}
        value={value}
      ></input>
      <br></br>
      <div style={{ display: "flex", flexDirection: "row" }}>
        <button
          style={{ marginTop: "4px", marginRight: "4px" }}
          onClick={() => {
            if (props.setAttributes)
              props.setAttributes({
                ...props.attributes,
                ...{ value },
              });
          }}
        >
          Save
        </button>
        <button
          style={{ marginTop: "4px", marginRight: "4px" }}
          onClick={() => {
            if (props.removeSelf) {
              props.removeSelf();
            }
          }}
        >
          Delete
        </button>
        <button
          style={{ marginTop: "4px", marginRight: "4px" }}
          onClick={() => {
            if (props.replaceSelf) {
              props.replaceSelf(`**${value}** is awesome ;)`);
            }
          }}
        >
          Replace
        </button>
      </div>
    </div>
  );
}

export const HelloWidget: WidgetCreator = (args) => {
  const el = document.createElement("span");
  ReactDOM.render(
    <Widget>
      <Hello {...args}></Hello>
    </Widget>,
    el
  );
  return el;
};
