import MarkdownIt from "markdown-it";

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: true
});

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
