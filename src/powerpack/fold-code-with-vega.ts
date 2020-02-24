// 0xGG Team
// Distributed under AGPL3
//
// DESCRIPTION: Vega support
// Please include the following in your index.html file
//
//      <script src="https://cdn.jsdelivr.net/npm/vega@5/build/vega.min.js"></script>

import * as CodeMirror from "codemirror";
import {
  registerRenderer,
  CodeRenderer,
  getAddon as getFoldCode
} from "../addon/fold-code";
import { getAddon as getFold } from "../addon/fold";
import * as YAML from "yamljs";
declare var vega: typeof import("vega");

export const VegaRenderer: CodeRenderer = (code, info) => {
  const id = "_vega_id_" + Math.round(1e9 * Math.random()).toString(36);
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
    asyncRenderer = () => {
      const view = new vega.View(vega.parse(spec), {
        renderer: "canvas",
        container: "#" + id
      });
      view.runAsync().then(() => {
        if (info.changed) {
          info.changed();
        }
      });
    };
  } catch (error) {
    el.innerText = error.toString();
  }

  return {
    element: el,
    asyncRenderer: asyncRenderer
  };
};

if (typeof vega !== "undefined" && vega.View) {
  CodeMirror.defineOption("vega", null, (cm: CodeMirror.Editor) => {
    getFoldCode(cm).clear("vega");
    getFold(cm).startFold();
  });

  registerRenderer({
    name: "vega",
    pattern: /^vega$/i,
    renderer: VegaRenderer,
    suggested: true
  });
  if (window["VICKYMD_DEBUG"]) {
    console.log("[HyperMD] PowerPack fold-code-with-vega loaded.");
  }
} else {
  if (window["VICKYMD_DEBUG"]) {
    console.log(`[HyperMD] PowerPack fold-code-with-vega failed to load.
Please include  

    <script src="https://cdn.jsdelivr.net/npm/vega@5/build/vega.min.js"></script>

in your HTML file`);
  }
}
