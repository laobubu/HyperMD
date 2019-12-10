import MarkdownIt from "markdown-it";
import {
  parseBlockInfo,
  normalizeBlockInfo
} from "../../addon/block-info/index";

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

    return `<pre data-role="codeBlock" class="vickeymd-fence" data-info="${escapeString(
      info
    )}" data-parsed-info="${escapeString(
      JSON.stringify(parsedInfo)
    )}" data-normalized-info="${escapeString(
      JSON.stringify(normalizedInfo)
    )}">${content}</pre>${finalBreak}`;
  };
};
