import MarkdownIt from "markdown-it";
import { Attributes } from "../../addon/fold";
import { defaultChecker } from "../../addon/fold-html";

export default (md: MarkdownIt) => {
  const renderWidget = (content: string) => {
    content = content
      .replace(/^<!--\s*/, "")
      .replace(/-->$/, "")
      .trim();
    let widgetName: string;
    let widgetAttributes: Attributes = {};
    const firstSpaceMatch = content.match(/\s/);
    const firstSpace = firstSpaceMatch ? firstSpaceMatch.index : -1;
    if (firstSpace > 0) {
      widgetName = content.slice(0, firstSpace).trim().replace(/^@/, "");
      try {
        widgetAttributes = JSON.parse(
          "{" +
            content
              .slice(firstSpace + 1)
              .trim()
              .replace(/-\\->/g, "-->")
              .replace(/<!\\--/g, "<!--")
              .replace(/\\\|/g, "|") +
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
  };

  const oldHTMLInlineRenderer = md.renderer.rules.html_inline;
  md.renderer.rules.html_inline = function (tokens, idx, options, env, slf) {
    const content = tokens[idx].content.trim();
    if (content.match(/^<!--\s*@/) && content.match(/-->$/)) {
      return renderWidget(content);
    } else {
      const html = oldHTMLInlineRenderer(tokens, idx, options, env, slf);
      if (defaultChecker(html)) {
        return html;
      } else {
        return "";
      }
    }
  };

  const oldHTMLBlockRenderer = md.renderer.rules.html_block;
  md.renderer.rules.html_block = function (tokens, idx, options, env, slf) {
    const content = tokens[idx].content.trim();
    if (content.match(/^<!--\s*@/) && content.match(/-->$/)) {
      return renderWidget(content);
    } else {
      const html = oldHTMLBlockRenderer(tokens, idx, options, env, slf);
      if (defaultChecker(html)) {
        return html;
      } else {
        return "";
      }
    }
  };
};
