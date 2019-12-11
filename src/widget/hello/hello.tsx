// 0xGG Team
// Distributed under AGPL3
//
// DESCRIPTION: This widget tries to build a widget using react

import { Attributes } from "../../addon/fold";
import React from "react";
import ReactDOM from "react-dom";

export function Hello() {
  return <div>Hello, world!</div>;
}

export function HelloWidget(attributes: Attributes) {
  const el = document.createElement("span");
  ReactDOM.render(<Hello></Hello>, el);
  return el;
}
