/* VickyMD
 * Distributed under AGPL3
 *
 * The code below is basic on https://github.com/markushedvall/plantuml-encoder/blob/master/dist/plantuml-encoder.min.js
 * Credit to @markushedvall
 *
 * Please include the following in your index.html file
 *
 *  <script src="https://cdnjs.cloudflare.com/ajax/libs/wavedrom/2.1.2/skins/default.js" type="text/javascript"></script>
 *  <script src="https://cdnjs.cloudflare.com/ajax/libs/wavedrom/2.1.2/wavedrom.min.js" type="text/javascript"></script>
 *
 */
import * as CodeMirror from "codemirror";
import {
  registerRenderer,
  CodeRenderer,
  getAddon as getFoldCode
} from "../addon/fold-code";
import { getAddon as getFold } from "../addon/fold";

export const WaveDromRenderer: CodeRenderer = (code, info) => {
  const targetClass = info.changed
    ? "vickeymd-wavedrom-editor"
    : "vickymd-wavedrom-preview";
  let seq = document.getElementsByClassName(targetClass).length; // Math.round(1e9 * Math.random()) + Date.now();
  const id = targetClass + seq;
  const el = document.createElement("div");
  el.id = id;
  el.classList.add(targetClass);
  el.style.margin = "8px";

  let json = {};
  try {
    json = JSON.parse(code);
  } catch (error) {
    el.innerText = error.toString();
    return el;
  }

  try {
    document.body.append(el); // HACK: Have to append to body first
    el.textContent = code;
    window["WaveDrom"].RenderWaveForm(seq, json, targetClass);
  } catch (error) {
    el.innerText = "Failed to eval WaveDrom code. " + error;
    console.log(error);
  }

  return el;
};

if (window["WaveDrom"]) {
  CodeMirror.defineOption("plantuml", null, (cm: CodeMirror.Editor) => {
    getFoldCode(cm).clear("plantuml");
    getFold(cm).startFold();
  });

  registerRenderer({
    name: "wavedrom",
    pattern: /^wavedrom$/i,
    renderer: WaveDromRenderer,
    suggested: true
  });
  console.log("[HyperMD] PowerPack fold-code-with-wavedrom loaded.");
} else {
  console.log(`[HyperMD] PowerPack fold-code-with-wavedrom failed to load.
Please include  

  <script src="https://cdnjs.cloudflare.com/ajax/libs/wavedrom/2.1.2/skins/default.js" type="text/javascript"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/wavedrom/2.1.2/wavedrom.min.js" type="text/javascript"></script>

in your HTML file`);
}

/*
Example:

```wavedrom
{"signal":[{"name":"clk","wave":"p...."},{"name":"Data","wave":"x345x","data":["head","body","tail"]},{"name":"Request","wave":"01..0"}],"config":{"hscale":1}}
```

*/
