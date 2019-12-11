import MarkdownIt from "markdown-it";
// import Prism from "prismjs";
import MarkdownItEmoji from "markdown-it-emoji";
import MarkdownItFootnote from "markdown-it-footnote";
import MarkdownItTaskLists from "markdown-it-task-lists";

import MathEnhancer from "./features/math";
import TagEnhancer from "./features/tag";
import WidgetEnhancer from "./features/widget";
import FenceEnhancer from "./features/fence";
import { TimerWidget } from "../widget/timer/timer";
import { BilibiliWidget } from "../widget/bilibili/bilibili";
import { YoutubeWidget } from "../widget/youtube/youtube";
import { VideoWidget } from "../widget/video/video";
import { AudioWidget } from "../widget/audio/audio";
import { ErrorWidget } from "../widget/error/error";

// Powerpacks
import { PlantUMLRenderer } from "../powerpack/fold-code-with-plantuml";

import { transformMarkdown, HeadingData } from "./transform";
import HeadingIdGenerator from "./heading-id-generator";
import { parseSlides } from "./slide";

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

    let html = md.render(outputString);
    if (slideConfigs.length) {
      html = parseSlides(html, slideConfigs);
      return {
        html,
        headings,
        slideConfigs
      };
    } else {
      return {
        html,
        headings,
        slideConfigs
      };
    }
  } catch (error) {
    return {
      html: `Failed to render markdown:\n${JSON.stringify(error)}`,
      headings: [],
      slideConfigs: []
    };
  }
}

function performAfterWorks(previewElement: HTMLElement) {
  renderWidgets(previewElement);
  renderCodeFences(previewElement);
}

/**
 * renderPreview
 * @param previewElement, which should be <div> element
 * @param markdown
 */
function renderPreview(previewElement: HTMLElement, markdown: string) {
  const { html, headings, slideConfigs } = renderMarkdown(markdown);
  if (!slideConfigs.length) {
    previewElement.innerHTML = html;
    performAfterWorks(previewElement);
  } else {
    // Slide
    previewElement.innerHTML = "";
    const iframe = document.createElement("iframe");

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
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@3.8.0/css/theme/white.css">

    <!-- prism github theme -->
    <link href="https://cdn.jsdelivr.net/npm/@shd101wyy/mume@0.4.7/styles/prism_theme/github.css" rel="stylesheet">
  </head>
  <body>
  ${html}
  </body>
  <!-- reveal.js -->
  <script src="https://cdn.jsdelivr.net/npm/reveal.js@3.8.0/js/reveal.min.js"></script>

  <!-- prism.js -->
  <script src="https://cdn.jsdelivr.net/npm/prismjs@1.17.1/prism.min.js"></script>

  <!-- initialize reveal.js -->
  <script>
Reveal.initialize();
  </script>
</html>`);

    iframe.onload = function() {
      console.log("iframe onload");
      performAfterWorks(iframe.contentWindow.document.body);
    };
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
    if (widgetName === "timer") {
      widget = TimerWidget(widgetAttributes);
    } else if (widgetName === "bilibili") {
      widget = BilibiliWidget(widgetAttributes);
    } else if (widgetName === "youtube") {
      widget = YoutubeWidget(widgetAttributes);
    } else if (widgetName === "video") {
      widget = VideoWidget(widgetAttributes);
    } else if (widgetName === "audio") {
      widget = AudioWidget(widgetAttributes, false);
    } else if (widgetName === "error") {
      widget = ErrorWidget(widgetAttributes as any);
    }
    if (widget) {
      widget.classList.add("vickymd-widget");
      widget.setAttribute("data-widget-name", widgetName);
      widget.setAttribute("data-widget-attributes", widgetAttributesStr);
      widgetSpan.replaceWith(widget);
    }
  }
}

function renderCodeFences(previewElement: HTMLElement) {
  console.log("renderCodeFences");
  const fences = previewElement.getElementsByClassName("vickeymd-fence");
  console.log("fences.length: ", fences.length);
  for (let i = 0; i < fences.length; i++) {
    const fence = fences[i];
    const language = fence.getAttribute("data-info") || "text";
    const code = fence.textContent;
    console.log("i: ", i);
    console.log("language: ", language);
    console.log("code: ", code);
    // TODO: Diagrams rendering
    if (language.match(/^(puml|plantuml)$/)) {
      // Diagrams
      const el = PlantUMLRenderer(code, null);
      fence.replaceWith(el);
      continue;
    } else {
      // Normal code block
      const pre = document.createElement("pre");
      if (!window["Prism"]) {
        console.log("window.Prism not found");
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
        console.log("highlight code fence");
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
function printPDF(previewElement) {
  if (!window["html2pdf"]) {
    throw new Error("html2pdf is not imported. Failed to print pdf");
  }
  window["html2pdf"](previewElement);
}

export { renderMarkdown, renderPreview, printPDF };
