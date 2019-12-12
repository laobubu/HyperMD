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
    <div style={{ padding: "24px", border: "1px solid #aaa" }}>
      <span>Hello, world! {value}</span>
      <br></br>
      <input
        onChange={event => {
          setValue(event.target.value);
        }}
        value={value}
      ></input>
      <br></br>
      <button
        onClick={() => {
          props.setAttributes({
            ...props.attributes,
            ...{ value }
          });
        }}
      >
        Submit
      </button>
      <br></br>
      <button
        onClick={() => {
          props.removeSelf();
        }}
      >
        Delete
      </button>
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
