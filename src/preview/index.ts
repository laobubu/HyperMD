import MarkdownIt from "markdown-it";
// import Prism from "prismjs";
import MarkdownItEmoji from "markdown-it-emoji";
import MarkdownItFootnote from "markdown-it-footnote";
import MarkdownItTaskLists from "markdown-it-task-lists";
declare var YAML: typeof import("yamljs");
// import * as YAML from "yamljs";

import MathEnhancer from "./features/math";
import TagEnhancer from "./features/tag";
import WidgetEnhancer from "./features/widget";
import FenceEnhancer from "./features/fence";

// Powerpacks
import { PlantUMLRenderer } from "../powerpack/fold-code-with-plantuml";

import { transformMarkdown, HeadingData } from "./transform";
import HeadingIdGenerator from "./heading-id-generator";
import { parseSlides } from "./slide";
import { EchartsRenderer } from "../powerpack/fold-code-with-echarts";
import { MermaidRenderer } from "../powerpack/fold-code-with-mermaid";
import { WaveDromRenderer } from "../powerpack/fold-code-with-wavedrom";
import { getWidgetCreator } from "../widget/index";
import { VegaRenderer } from "../powerpack/fold-code-with-vega";
import { VegaLiteRenderer } from "../powerpack/fold-code-with-vega-lite";

declare var html2pdf: typeof import("html2pdf.js").default;

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: true
});

md.use(MarkdownItEmoji);
md.use(MarkdownItFootnote);
md.use(MarkdownItTaskLists);
TagEnhancer(md);
MathEnhancer(md);
WidgetEnhancer(md);
FenceEnhancer(md);

interface RenderMarkdownOutput {
  html: string;
  headings: HeadingData[];
  slideConfigs: object[];
  yamlConfig: any;
}
/**
 * renderMarkdown
 * @param markdown
 */
function renderMarkdown(markdown: string): RenderMarkdownOutput {
  try {
    const {
      slideConfigs,
      headings,
      outputString,
      frontMatterString
    } = transformMarkdown(markdown, {
      forPreview: true,
      headingIdGenerator: new HeadingIdGenerator(),
      forMarkdownExport: false,
      usePandocParser: false
    });

    let yamlConfig = {};
    try {
      yamlConfig = YAML.parse(
        frontMatterString
          .trim()
          .replace(/^\-+/, "")
          .replace(/\-+$/, "")
          .trim()
      );
    } catch (error) {
      yamlConfig = {};
    }

    let html = md.render(outputString);
    if (slideConfigs.length) {
      html = parseSlides(html, slideConfigs);
      return {
        html,
        headings,
        slideConfigs,
        yamlConfig
      };
    } else {
      return {
        html,
        headings,
        slideConfigs,
        yamlConfig
      };
    }
  } catch (error) {
    return {
      html: `Failed to render markdown:\n${JSON.stringify(error)}`,
      headings: [],
      slideConfigs: [],
      yamlConfig: {}
    };
  }
}

function performAfterWorks(
  previewElement: HTMLElement,
  isPresentation = false
) {
  renderWidgets(previewElement);
  renderCodeFences(previewElement, isPresentation);
}

const RevealJSThemes = {
  "beige.css": "beige.css",
  "black.css": "black.css",
  "blood.css": "blood.css",
  "league.css": "league.css",
  "moon.css": "moon.css",
  "night.css": "night.css",
  "serif.css": "serif.css",
  "simple.css": "simple.css",
  "sky.css": "sky.css",
  "solarized.css": "solarized.css",
  "white.css": "white.css"
};

const AutoPrismThemeMapForPresentation = {
  "beige.css": "pen-paper-coffee.css",
  "black.css": "one-dark.css",
  "blood.css": "monokai.css",
  "league.css": "okaidia.css",
  "moon.css": "funky.css",
  "night.css": "atom-dark.css",
  "serif.css": "github.css",
  "simple.css": "github.css",
  "sky.css": "default.css",
  "solarized.css": "solarized-light.css",
  "white.css": "default.css"
};

/**
 * renderPreview
 * @param previewElement, which should be <div> element
 * @param markdown
 */
function renderPreview(previewElement: HTMLElement, markdown: string) {
  const { html, headings, slideConfigs, yamlConfig } = renderMarkdown(markdown);
  previewElement.setAttribute("data-vickymd-preview", "true");
  if (!slideConfigs.length) {
    previewElement.innerHTML = html;
    performAfterWorks(previewElement);
  } else {
    const id = "reveal.js." + Date.now();
    // Slide
    previewElement.innerHTML = "";
    const iframe = document.createElement("iframe");

    // Check wavedrom
    let wavedromScript = "";
    let wavedromInitScript = "";
    if (html.indexOf("wavedrom") >= 0) {
      wavedromScript += `<script src="https://cdn.jsdelivr.net/npm/wavedrom@2.3.0/skins/default.js"></script>`;
      wavedromScript += `<script src="https://cdn.jsdelivr.net/npm/wavedrom@2.3.0/wavedrom.min.js"></script>`;
      wavedromInitScript += `<script>
Reveal.addEventListener("ready", ()=> {
  WaveDrom.ProcessAll()
})      
</script>`;
    }

    // Check mermaid. Copied from @shd101wyy/mume
    let mermaidScript = "";
    let mermaidInitScript = "";
    if (html.indexOf("mermaid") >= 0) {
      mermaidScript = `<script type="text/javascript" src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>`;
      mermaidInitScript += `<script>
      if (window['MERMAID_CONFIG']) {
        window['MERMAID_CONFIG'].startOnLoad = false
        window['MERMAID_CONFIG'].cloneCssStyles = false
      }
      mermaid.initialize(window['MERMAID_CONFIG'] || {})
      if (typeof(window['Reveal']) !== 'undefined') {
        function mermaidRevealHelper(event) {
          var currentSlide = event.currentSlide
          var diagrams = currentSlide.querySelectorAll('.mermaid')
          for (var i = 0; i < diagrams.length; i++) {
            var diagram = diagrams[i]
            if (!diagram.hasAttribute('data-processed')) {
              mermaid.init(null, diagram, ()=> {
                Reveal.slide(event.indexh, event.indexv)
              })
            }
          }
        }
        Reveal.addEventListener('slidechanged', mermaidRevealHelper)
        Reveal.addEventListener('ready', mermaidRevealHelper)
      } else {
        mermaid.init(null, document.getElementsByClassName('mermaid'))
      }
      </script>`;
    }

    // reveal.js
    let revealJSConfig = {};
    if (yamlConfig && yamlConfig["presentation"]) {
      revealJSConfig = yamlConfig["presentation"] || {};
    }
    let revealJSTheme = "white.css";
    if (revealJSConfig && revealJSConfig["theme"]) {
      revealJSTheme = RevealJSThemes[revealJSConfig["theme"]] || "white.css";
    }
    let revealJSCodeBlockTheme =
      AutoPrismThemeMapForPresentation[revealJSTheme];

    iframe.style.border = "none";
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.boxSizing = "border-box";
    previewElement.appendChild(iframe);
    iframe.contentWindow.document.write(`<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    
    <!-- reveal.js styles -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@3.8.0/css/reveal.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@3.8.0/css/theme/${revealJSTheme}">

    <!-- katex -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.11.1/dist/katex.min.css">

    <!-- prism github theme -->
    <link href="https://cdn.jsdelivr.net/npm/@shd101wyy/mume@0.4.7/styles/prism_theme/${revealJSCodeBlockTheme}" rel="stylesheet">
  
    <!-- mermaid -->
    ${mermaidScript}

    <!-- wavedrom -->
    ${wavedromScript}
  </head>
  <body>
  ${html}
  </body>
  <!-- reveal.js -->
  <script src="https://cdn.jsdelivr.net/npm/reveal.js@3.8.0/js/reveal.min.js"></script>

  <!-- prism.js -->
  <script src="https://cdn.jsdelivr.net/npm/prismjs@1.17.1/prism.min.js"></script>

  <!-- mermaid -->
  ${mermaidInitScript}

  <!-- wavedrom -->
  ${wavedromInitScript}

  <!-- initialize reveal.js -->
  <script>
Reveal.initialize(${JSON.stringify({
      margin: 0.1,
      ...revealJSConfig
    })});
Reveal.addEventListener('ready', function(event) {
  parent.postMessage({event: "reveal-ready", id:"${id}"})
})
  </script>
</html>`);
    window.addEventListener("message", function(event) {
      if (
        event.data &&
        event.data.event === "reveal-ready" &&
        event.data.id === id
      ) {
        performAfterWorks(iframe.contentWindow.document.body, true);
      }
    });
  }
}

function renderWidgets(previewElement: HTMLElement) {
  // render widgets
  const widgets = previewElement.getElementsByClassName("vickymd-widget");
  for (let i = 0; i < widgets.length; i++) {
    const widgetSpan = widgets[i];
    const widgetName = widgetSpan.getAttribute("data-widget-name");
    const widgetAttributesStr = widgetSpan.getAttribute(
      "data-widget-attributes"
    );
    let widgetAttributes = {};
    try {
      widgetAttributes = JSON.parse(widgetAttributesStr);
    } catch (error) {
      widgetAttributes = {};
    }

    let widget: HTMLElement = null;
    const widgetCreator = getWidgetCreator(widgetName);
    if (!widgetCreator) {
      continue;
    }
    widget = widgetCreator({
      attributes: widgetAttributes,
      isPreview: true
    });
    if (widget) {
      widget.classList.add("vickymd-widget");
      widget.setAttribute("data-widget-name", widgetName);
      widget.setAttribute("data-widget-attributes", widgetAttributesStr);
      widgetSpan.replaceWith(widget);
    }
    widgetSpan.replaceWith(widget);
  }
}

function renderCodeFences(previewElement: HTMLElement, isPresentation = false) {
  const fences = previewElement.getElementsByClassName("vickeymd-fence");
  const copyFences = [];
  for (let i = 0; i < fences.length; i++) {
    // replaceChild will cause issue, therefore we need to make a copy of the original elements array
    copyFences.push(fences[i]);
  }
  for (let i = 0; i < copyFences.length; i++) {
    const fence = copyFences[i];
    const parsedInfo = fence.getAttribute("data-parsed-info") || "{}";
    let info: any = {};
    try {
      info = JSON.parse(parsedInfo);
    } catch (error) {
      info = {};
    }
    const code = fence.textContent;
    const language = info["language"] || "text";
    // TODO: Diagrams rendering
    if (language.match(/^(puml|plantuml)$/)) {
      // Diagrams
      const { element } = PlantUMLRenderer(code, info);
      fence.replaceWith(element);
      continue;
    } else if (language.match(/^echarts$/)) {
      const { element } = EchartsRenderer(code, info);
      fence.replaceWith(element);
    } else if (language.match(/^mermaid$/)) {
      if (!isPresentation) {
        // console.log("render mermaid")
        const { element } = MermaidRenderer(code, info);
        fence.replaceWith(element);
      }
    } else if (language.match(/^vega$/)) {
      const { element, asyncRenderer } = VegaRenderer(code, info);
      fence.replaceWith(element);
      if (asyncRenderer) asyncRenderer();
    } else if (language.match(/^vega\-lite$/)) {
      const { element, asyncRenderer } = VegaLiteRenderer(code, info);
      fence.replaceWith(element);
      if (asyncRenderer) asyncRenderer();
    } else if (language.match(/^wavedrom$/i)) {
      if (!isPresentation) {
        const { element, asyncRenderer } = WaveDromRenderer(code, info);
        fence.replaceWith(element);
        if (asyncRenderer) asyncRenderer();
      }
    } else {
      // Normal code block
      const pre = document.createElement("pre");
      if (!window["Prism"]) {
        pre.textContent = code;
        fence.replaceWith(pre);
        continue;
      }
      if (!(language in window["Prism"].languages)) {
        pre.classList.add("language-text");
        pre.textContent = code;
        fence.replaceWith(pre);
        continue;
      }

      try {
        const html = window["Prism"].highlight(
          code,
          window["Prism"].languages[language],
          language
        );
        pre.classList.add(`language-${language}`);
        pre.innerHTML = html; // <= QUESTION: Is this safe?
        fence.replaceWith(pre);
        continue;
      } catch (error) {
        pre.classList.add("language-error");
        pre.textContent = error.toString();
        fence.replaceWith(pre);
        continue;
      }
    }
  }
}

/**
 * Print as PDF
 * @param previewElement
 */
function printPDF(
  previewElement: HTMLElement,
  printOption = {},
  bannerElement?: HTMLElement
) {
  return new Promise((resolve, reject) => {
    if (!window["html2pdf"]) {
      throw new Error("html2pdf is not imported. Failed to print pdf");
    }
    if (!bannerElement) {
      bannerElement = document.createElement("div");
      bannerElement.style.position = "fixed";
      bannerElement.style.width = "100%";
      bannerElement.style.height = "100%";
      bannerElement.style.top = "0";
      bannerElement.style.left = "0";
      bannerElement.style.textAlign = "center";
      bannerElement.style.backgroundColor = "#fff";
      bannerElement.style.zIndex = "9999";
      bannerElement.innerHTML = `<p>Printing ...</p>`;
    }
    document.body.appendChild(bannerElement);
    const oldDisplayStyle = previewElement.style.display;
    const oldPositionStyle = previewElement.style.position;
    const oldPadding = previewElement.style.padding;
    const oldMargin = previewElement.style.margin;
    previewElement.style.display = "block";
    previewElement.style.position = "relative";
    previewElement.style.padding = "0";
    previewElement.style.margin = "0";
    const restore = () => {
      document.body.removeChild(bannerElement);
      previewElement.style.display = oldDisplayStyle;
      previewElement.style.position = oldPositionStyle;
      previewElement.style.padding = oldPadding;
      previewElement.style.margin = oldMargin;
    };
    html2pdf()
      .set(printOption)
      .from(previewElement)
      .save()
      .then(() => {
        restore();
        return resolve();
      })
      .catch(error => {
        restore();
        return reject(error);
      });
  });
}

function print(
  previewElement: HTMLElement,
  bannerElement?: HTMLElement,
  timeout = 2000
) {
  if (!bannerElement) {
    bannerElement = document.createElement("div");
    bannerElement.style.position = "fixed";
    bannerElement.style.width = "100%";
    bannerElement.style.height = "100%";
    bannerElement.style.top = "0";
    bannerElement.style.left = "0";
    bannerElement.style.textAlign = "center";
    bannerElement.style.backgroundColor = "#fff";
    bannerElement.style.zIndex = "9999";
    bannerElement.innerHTML = `<p>Preparing ...</p>`;
  }
  bannerElement.classList.add("print-hidden");
  document.body.appendChild(bannerElement);

  const styleElement = document.createElement("style");
  styleElement.innerHTML = `
@media print {
  .print-hidden, #test-box {
    display: none;
  }
}
`;
  document.body.appendChild(styleElement);

  const oldDisplayStyle = previewElement.style.display;
  const oldPositionStyle = previewElement.style.position;
  const oldWidthStyle = previewElement.style.width;
  const oldHeightStyle = previewElement.style.height;
  const oldOverflowStyle = previewElement.style.overflow;
  const oldTopStyle = previewElement.style.top;
  const oldLeftStyle = previewElement.style.left;
  const oldPaddingStyle = previewElement.style.padding;
  const oldMarginStyle = previewElement.style.margin;
  previewElement.style.display = "block";
  previewElement.style.position = "absolute";
  previewElement.style.width = "100%";
  previewElement.style.height = "auto";
  previewElement.style.overflow = "auto";
  previewElement.style.zIndex = "9999";
  previewElement.style.top = "0";
  previewElement.style.left = "0";
  previewElement.style.padding = "0";
  previewElement.style.margin = "0";

  const restore = () => {
    document.body.removeChild(bannerElement);
    document.body.removeChild(styleElement);
    previewElement.style.display = oldDisplayStyle;
    previewElement.style.position = oldPositionStyle;
    previewElement.style.width = oldWidthStyle;
    previewElement.style.height = oldHeightStyle;
    previewElement.style.overflow = oldOverflowStyle;
    previewElement.style.top = oldTopStyle;
    previewElement.style.left = oldLeftStyle;
    previewElement.style.padding = oldPaddingStyle;
    previewElement.style.margin = oldMarginStyle;
  };

  setTimeout(() => {
    window.print();
    restore();
  }, timeout);
}

export { renderMarkdown, renderPreview, printPDF, print };

/*

---
presentation:
  theme: black.css
---

<!-- slide -->

# Hi

*/
