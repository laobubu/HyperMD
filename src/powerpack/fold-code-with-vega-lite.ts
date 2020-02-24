// 0xGG Team
// Distributed under AGPL3
//
// DESCRIPTION: Vega support
// Please include the following in your index.html file
//
//    <script src="https://cdn.jsdelivr.net/npm/vega-lite@4/build/vega-lite.min.js"></script>
//    <script src="https://cdn.jsdelivr.net/npm/vega-embed@6/build/vega-embed.min.js"></script>

import * as CodeMirror from "codemirror";
import {
  registerRenderer,
  CodeRenderer,
  getAddon as getFoldCode
} from "../addon/fold-code";
import { getAddon as getFold } from "../addon/fold";
import * as YAML from "yamljs";
declare var vegaEmbed: typeof import("vega-embed").default;

export const VegaLiteRenderer: CodeRenderer = (code, info) => {
  const id = "_vega-lite_id_" + Math.round(1e9 * Math.random()).toString(36);
  const el = document.createElement("div");
  el.id = id;
  let asyncRenderer = null;
  try {
    let spec = {};
    if (code.trim()[0] !== "{") {
      spec = YAML.parse(code);
    } else {
      spec = JSON.parse(code);
    }
    vegaEmbed("#" + id, spec);
  } catch (error) {
    el.innerText = error.toString();
  }

  return {
    element: el,
    asyncRenderer: null
  };
};

if (typeof vegaEmbed !== "undefined") {
  CodeMirror.defineOption("vega-lite", null, (cm: CodeMirror.Editor) => {
    getFoldCode(cm).clear("vega-lite");
    getFold(cm).startFold();
  });

  registerRenderer({
    name: "vega-lite",
    pattern: /^vega\-lite$/i,
    renderer: VegaLiteRenderer,
    suggested: true
  });
  if (window["VICKYMD_DEBUG"]) {
    console.log("[HyperMD] PowerPack fold-code-with-vega-lite loaded.");
  }
} else {
  if (window["VICKYMD_DEBUG"]) {
    console.log(`[HyperMD] PowerPack fold-code-with-vega-lite failed to load.
Please include  

    <script src="https://cdn.jsdelivr.net/npm/vega-lite@4/build/vega-lite.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/vega-embed@6/build/vega-embed.min.js"></script>

in your HTML file`);
  }
}
