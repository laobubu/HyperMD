import MarkdownIt from "markdown-it";
import {
  parseBlockInfo,
  normalizeBlockInfo
} from "../../addon/block-info/index";
import { Attributes } from "../../addon/attributes/index";

const TAGS_TO_REPLACE = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
  "/": "&#x2F;",
  "\\": "&#x5C;"
};

const TAGS_TO_REPLACE_REVERSE = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&apos;": "'",
  "&#x27;": "'",
  "&#x2F;": "/",
  "&#x5C;": "\\"
};

export function escapeString(str: string = ""): string {
  return str.replace(/[&<>"'\/\\]/g, tag => TAGS_TO_REPLACE[tag] || tag);
}

export function unescapeString(str: string = ""): string {
  return str.replace(
    /\&(amp|lt|gt|quot|apos|\#x27|\#x2F|\#x5C)\;/g,
    whole => TAGS_TO_REPLACE_REVERSE[whole] || whole
  );
}

const ensureClassInAttributes = (attributes: Attributes, className: string) => {
  const existingClassNames: string = attributes["class"] || "";
  if (existingClassNames.split(" ").indexOf(className) === -1) {
    return {
      ...attributes,
      ["class"]: `${existingClassNames} ${className}`.trim()
    };
  }
};

export default (md: MarkdownIt) => {
  md.renderer.rules.fence = (tokens, idx, options, env, instance) => {
    const token = tokens[idx];

    // get code info (same line as opening fence)
    const info = token.info.trim();
    const parsedInfo = parseBlockInfo(info);
    const normalizedInfo = normalizeBlockInfo(parsedInfo);

    // get code content
    const content = escapeString(token.content);

    // copied from getBreak function.
    const finalBreak =
      idx < tokens.length && tokens[idx].type === "list_item_close" ? "\n" : "";

    // Check diagrams
    // https://github.com/shd101wyy/mume/blob/eb0f4107ee98505e8b5751d486f8c061c3b939b5/src/render-enhancers/fenced-diagrams.ts
    if (parsedInfo.language === "mermaid") {
      return `<div class="vickeymd-fence ${
        parsedInfo.language
      }" data-parsed-info="${escapeString(
        JSON.stringify(parsedInfo)
      )}" data-normalized-info="${escapeString(
        JSON.stringify(normalizedInfo)
      )}">${content}</div>`;
    } else if (parsedInfo.language === "wavedrom") {
      return `<div class="vickeymd-fence ${
        parsedInfo.language
      }" data-parsed-info="${escapeString(
        JSON.stringify(parsedInfo)
      )}" data-normalized-info="${escapeString(
        JSON.stringify(normalizedInfo)
      )}"><script type="WaveDrom">${token.content}</script></div>`;
    }
    return `<pre data-role="codeBlock" class="vickeymd-fence" data-info="${escapeString(
      info
    )}" data-parsed-info="${escapeString(
      JSON.stringify(parsedInfo)
    )}" data-normalized-info="${escapeString(
      JSON.stringify(normalizedInfo)
    )}">${content}</pre>${finalBreak}`;
  };
};
