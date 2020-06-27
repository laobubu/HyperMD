/**
 * inline [[]]
 * [[...]]
 */

export default (md: any) => {
  // @ts-ignore
  md.inline.ruler.before("autolink", "wikilink", (state, silent) => {
    if (!state.src.startsWith("[[", state.pos)) {
      return false;
    }

    let content = null;
    const tag = "]]";
    let end = -1;

    let i = state.pos + tag.length;
    while (i < state.src.length) {
      if (state.src[i] === "\\") {
        i += 1;
      } else if (state.src.startsWith(tag, i)) {
        end = i;
        break;
      }
      i += 1;
    }

    if (end >= 0) {
      // found ]]
      content = state.src.slice(state.pos + tag.length, end);
    } else {
      return false;
    }

    if (content && !silent) {
      const token = state.push("wikilink");
      token.content = content;

      state.pos += content.length + 2 * tag.length;
      return true;
    } else {
      return false;
    }
  });

  md.renderer.rules.wikilink = (tokens, idx) => {
    const { content } = tokens[idx];
    if (!content) {
      return;
    }

    const splits = content.split("|");
    let linkText, wikiLink;
    if (splits.length === 2) {
      wikiLink = splits[0].trim();
      linkText = splits[1].trim();
    } else {
      linkText = splits[0].trim();
      wikiLink = splits[0].trim();
    }

    return `<a href="${wikiLink}" data-wikilink-url=${wikiLink}>${linkText}</a>`;
  };
};
