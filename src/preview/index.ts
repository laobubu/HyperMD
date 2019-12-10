import MarkdownIt from "markdown-it";
// import Prism from "prismjs";
import MarkdownItEmoji from "markdown-it-emoji";
import MarkdownItFootnote from "markdown-it-footnote";
import MarkdownItTaskLists from "markdown-it-task-lists";

import MathEnhancer from "./features/math";
import TagEnhancer from "./features/tag";

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
}

export { renderMarkdown, renderPreview };
