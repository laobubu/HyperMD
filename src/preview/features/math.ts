import * as katex from "katex";

interface ParseMathArgs {
  content: string;
  displayMode: boolean;
}

/**
 *
 * @param content the math expression
 * @param displayMode whether to be rendered in display mode
 */
function parseMath({ content, displayMode }: ParseMathArgs) {
  if (!content) {
    return "";
  }
  try {
    return (katex as any).renderToString(
      content,
      Object.assign({}, /*configs.katexConfig ||*/ {}, { displayMode })
    );
  } catch (error) {
    return `<span style=\"color: #ee7f49; font-weight: 500;\">${error.toString()}</span>`;
  }
}

export default (md: any) => {
  // @ts-ignore
  md.inline.ruler.before("escape", "math", (state, silent) => {
    let openTag = null;
    let closeTag = null;
    let displayMode = true;
    const inlineDelimiters = [["$", "$"]];
    const blockDelimiters = [["$$", "$$"]];

    for (const tagPair of blockDelimiters) {
      if (state.src.startsWith(tagPair[0], state.pos)) {
        [openTag, closeTag] = tagPair;
        break;
      }
    }

    if (!openTag) {
      for (const tagPair of inlineDelimiters) {
        if (state.src.startsWith(tagPair[0], state.pos)) {
          [openTag, closeTag] = tagPair;
          displayMode = false;
          break;
        }
      }
    }

    if (!openTag) {
      return false; // not math
    }

    let content = null;
    let end = -1;

    let i = state.pos + openTag.length;
    while (i < state.src.length) {
      if (state.src.startsWith(closeTag, i)) {
        end = i;
        break;
      } else if (state.src[i] === "\\") {
        i += 1;
      }
      i += 1;
    }

    if (end >= 0) {
      content = state.src.slice(state.pos + openTag.length, end);
    } else {
      return false;
    }

    if (content && !silent) {
      const token = state.push("math");
      token.content = content.trim();
      token.openTag = openTag;
      token.closeTag = closeTag;
      token.displayMode = displayMode;

      state.pos += content.length + openTag.length + closeTag.length;
      return true;
    } else {
      return false;
    }
  });

  md.renderer.rules.math = (tokens: any[], idx: number) => {
    const content: string = tokens[idx] ? tokens[idx].content : null;
    return parseMath({
      content,
      displayMode: (tokens[idx] as any).displayMode
    });
  };
};
