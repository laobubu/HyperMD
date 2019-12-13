// 0xGG Team
// Distributed under AGPL3
//
// DESCRIPTION: This widget tries to build a widget using react

import { Attributes } from "../../addon/fold";
import React, { useState } from "react";
import ReactDOM from "react-dom";
import { Widget } from "../component/widget";
import { WidgetCreator } from "..";

interface Props {
  attributes: Attributes;
  setAttributes: (attributes: Attributes) => void;
  removeSelf: () => void;
}
function Hello(props: Props) {
  const [value, setValue] = useState<string>(props.attributes.value || "");
  return (
    <div
      style={{
        cursor: "default",
        padding: "24px",
        boxShadow: "0 1px 6px 2px #ddd"
      }}
    >
      <span>
        Hello, world! I am <b>{value || "VickyMD"}</b>
      </span>
      <br></br>
      <input
        onChange={event => {
          setValue(event.target.value);
        }}
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
                ...{ value }
              });
          }}
        >
          Save
        </button>
        <br></br>
        <button
          style={{ marginTop: "4px", marginRight: "4px" }}
          onClick={() => {
            props.removeSelf();
          }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

export const HelloWidget: WidgetCreator = args => {
  const el = document.createElement("span");
  ReactDOM.render(
    <Widget>
      <Hello
        attributes={args.attributes}
        setAttributes={args.setAttributes}
        removeSelf={args.removeSelf}
      ></Hello>
    </Widget>,
    el
  );
  return el;
};
