import React, { useState } from "react";
import ReactDOM from "react-dom";

function CodeBlock(props: any) {
  return (
    <div className="codeBlockWrapper">
      <pre><code className="codeBlock">
      </code></pre>
    </div>
  );
}

export const RenderCodeBlock = (args) => {
  const el = document.createElement("span");
  ReactDOM.render(<CodeBlock {...args}></CodeBlock>, el);

  const baseEl = el.querySelector(".codeBlock")
  var lineEl = null;
  args.code.split("\n").forEach(function(val) {
    lineEl = document.createElement("div");
    lineEl.className = "codeLine";
    window.CodeMirror.runMode(val, args.lang, lineEl);
    baseEl.append(lineEl);
  })
  return el;
};
