import MarkdownIt from "markdown-it";
import { Attributes } from "../../addon/fold";

export default (md: MarkdownIt) => {
  const oldCodeInlineRenderer = md.renderer.rules.code_inline;

  md.renderer.rules.code_inline = function(tokens, idx, options, env, slf) {
    const content = tokens[idx].content.trim() || "";
    if (content.startsWith("@")) {
      // TODO: Refactor fold-widget.ts
      let widgetName: string;
      let widgetAttributes: Attributes = {};
      const firstSpaceMatch = content.match(/\s/);
      const firstSpace = firstSpaceMatch ? firstSpaceMatch.index : -1;
      if (firstSpace > 0) {
        widgetName = content
          .slice(0, firstSpace)
          .trim()
          .replace(/^@/, "");
        try {
          widgetAttributes = JSON.parse(
            "{" +
              content
                .slice(firstSpace + 1)
                .trim()
                .replace(/\\`/g, "`") +
              "}"
          );
        } catch (error) {
          widgetName = "error";
          widgetAttributes = { message: error.toString() };
        }
      } else {
        widgetName = content.trim().replace(/^@/, "");
      }
      if (widgetName) {
        return `<span class="vickymd-widget" data-widget-name='${widgetName}' data-widget-attributes='${JSON.stringify(
          widgetAttributes
        )}'></span>`;
      }
    }

    return oldCodeInlineRenderer(tokens, idx, options, env, slf);
  };
};
