import MarkdownIt from "markdown-it";
// import Prism from "prismjs";
import MarkdownItEmoji from "markdown-it-emoji";
import MarkdownItFootnote from "markdown-it-footnote";
import MarkdownItTaskLists from "markdown-it-task-lists";

import MathEnhancer from "./features/math";
import TagEnhancer from "./features/tag";
import WidgetEnhancer from "./features/widget";
import { TimerWidget } from "../widget/timer/timer";
import { BilibiliWidget } from "../widget/bilibili/bilibili";
import { YoutubeWidget } from "../widget/youtube/youtube";
import { VideoWidget } from "../widget/video/video";
import { AudioWidget } from "../widget/audio/audio";
import { ErrorWidget } from "../widget/error/error";

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: true,
  highlight: (code: string, language: string) => {
    if (!window["Prism"]) {
      return `<pre>${code}</pre>`;
    }
    if (!(language in window["Prism"].languages)) {
      return `<pre class="language-text">${code}</pre>`;
    }
    try {
      const html = window["Prism"].highlight(
        code,
        window["Prism"].languages[language],
        language
      );
      return `<pre class="language-${language}">${html}</pre>`;
    } catch (error) {
      return `<pre class="language-error">${error.toString()}</pre>`;
    }
  }
});

md.use(MarkdownItEmoji);
md.use(MarkdownItFootnote);
md.use(MarkdownItTaskLists);
TagEnhancer(md);
MathEnhancer(md);
WidgetEnhancer(md);

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
 * @param previewElement
 * @param markdown
 */
function renderPreview(previewElement: HTMLElement, markdown: string) {
  previewElement.innerHTML = renderMarkdown(markdown);
  renderWidgets(previewElement);
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

export { renderMarkdown, renderPreview };
