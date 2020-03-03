// 0xGG Team
// Distributed under AGPL3
//
// DESCRIPTION: The code below is basic on https://github.com/markushedvall/plantuml-encoder/blob/master/dist/plantuml-encoder.min.js. Credit to @markushedvall
// Please include the following in your index.html file
//
//   <script src="https://cdn.jsdelivr.net/npm/plantuml-encoder@1.4.0/dist/plantuml-encoder.min.js"></script>

import * as CodeMirror from "codemirror";
import {
  registerRenderer,
  CodeRenderer,
  getAddon as getFoldCode,
  convertNumberToString
} from "../addon/fold-code";
import { getAddon as getFold } from "../addon/fold";

export const PlantUMLRenderer: CodeRenderer = (code, info) => {
  const id = "_plantuml_id_" + Math.round(1e9 * Math.random()).toString(36);
  const el = document.createElement("div");
  el.style.margin = "8px";

  const encoded = window["plantumlEncoder"].encode(code);
  const url = "https://www.plantuml.com/plantuml/img/" + encoded;

  el.setAttribute("id", id);

  const img = document.createElement("img");
  img.src = url;
  el.appendChild(img);
  return {
    element: el,
    asyncRenderer: null
  };
};

if (window["plantumlEncoder"]) {
  CodeMirror.defineOption("plantuml", null, (cm: CodeMirror.Editor) => {
    getFoldCode(cm).clear("plantuml");
    getFold(cm).startFold();
  });

  registerRenderer({
    name: "plantuml",
    pattern: /^(plantuml|puml)$/i,
    renderer: PlantUMLRenderer,
    suggested: true
  });
  if (window["VICKYMD_DEBUG"]) {
    console.log("[HyperMD] PowerPack fold-code-with-plantuml loaded.");
  }
} else {
  if (window["VICKYMD_DEBUG"]) {
    console.log(`[HyperMD] PowerPack fold-code-with-plantuml failed to load.
Please include  

  <script src="https://cdn.jsdelivr.net/npm/plantuml-encoder@1.4.0/dist/plantuml-encoder.min.js"></script>

in your HTML file`);
  }
}
