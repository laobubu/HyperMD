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

import { PlantUMLRenderer } from "../powerpack/fold-code-with-plantuml";

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

/**
 * renderMarkdown
 * @param markdown
 */
function renderMarkdown(markdown: string) {
  try {
    // because md.render sometimes will fail.
    return md.render(markdown);
  } catch (error) {
    return `Failed to render markdown:\n${JSON.stringify(error)}`;
  }
}

/**
 * renderPreview
 * @param previewElement, which should be <div> element
 * @param markdown
 */
function renderPreview(previewElement: HTMLElement, markdown: string) {
  previewElement.innerHTML = renderMarkdown(markdown);
  renderWidgets(previewElement);
  renderCodeFences(previewElement);
}

/**
 * renderIframe
 * @param iframeElement, which should be <iframe> element
 * @param markdown
 */
function renderIframe(iframeElement: HTMLElement, markdown: string) {}

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
  const fences = previewElement.getElementsByClassName("vickeymd-fence");
  for (let i = 0; i < fences.length; i++) {
    const fence = fences[i];
    const language = fence.getAttribute("data-info") || "text";
    const code = fence.textContent;
    // TODO: Diagrams rendering
    if (language.match(/^(puml|plantuml)$/)) {
      // Diagrams
      const el = PlantUMLRenderer(code, null);
      return fence.replaceWith(el);
    } else {
      // Normal code block
      const pre = document.createElement("pre");
      if (!window["Prism"]) {
        pre.textContent = code;
        return fence.replaceWith(pre);
      }
      if (!(language in window["Prism"].languages)) {
        pre.classList.add("language-text");
        pre.textContent = code;
        return fence.replaceWith(pre);
      }

      try {
        const html = window["Prism"].highlight(
          code,
          window["Prism"].languages[language],
          language
        );
        pre.classList.add(`language-${language}`);
        pre.innerHTML = html; // <= QUESTION: Is this safe?
        return fence.replaceWith(pre);
      } catch (error) {
        pre.classList.add("language-error");
        pre.textContent = error.toString();
        return fence.replaceWith(pre);
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
