const StopRegExp = /[\s@#,.!$%^&*()\[\]-_+=~`<>?\\，。]/;
export default function (md: any) {
  md.inline.ruler.before("escape", "tag", (state: any, silent: boolean) => {
    let tagMode = null; // TODO: Support @mention later
    /*if (state.src[state.pos] === '@') {
      tagMode = "mention";
    } else*/ if (
      (state.src[state.pos - 1] || "").match(/(^|\s)$/) &&
      state.src[state.pos] === "#" &&
      !state.src[state.pos + 1].match(StopRegExp)
    ) {
      tagMode = "topic";
    }

    if (!tagMode) {
      return false;
    }

    let content = "";
    let end = -1;
    let i = state.pos + 1;
    while (i < state.src.length) {
      if (state.src[i].match(StopRegExp)) {
        end = i;
        let j = i + 1;
        while (j < state.src.length) {
          if (state.src[j] === "#") {
            if (
              j === state.src.length - 1 ||
              state.src[j + 1].match(StopRegExp)
            ) {
              end = j;
            }
            break;
          }
          j += 1;
        }
        break;
      } else if (state.src[i] === "\\") {
        i += 1;
      }
      i += 1;
    }
    if (end === -1) {
      end = i;
    }

    if (end >= 0) {
      content = state.src.slice(state.pos + 1, end);
    } else {
      return false;
    }

    if (content && !silent) {
      const token = state.push("tag");
      token.content = content.trim();
      token.tagMode = tagMode;

      if (
        (end < state.src.length && state.src[end].match(/\s/)) ||
        state.src[end] === "#"
      ) {
        state.pos = end + 1;
      } else {
        state.pos = end;
      }
      return true;
    } else {
      return false;
    }
  });

  md.renderer.rules.tag = (tokens: any[], idx: number) => {
    const content: string = tokens[idx] ? tokens[idx].content : null;
    const tagMode = tokens[idx] ? tokens[idx].tagMode : null;
    if (!content || !tagMode) {
      return `<a class="tag tag-error" data-error="Invalid tag">loading...</a>`;
    } else if (tagMode === "mention") {
      return `<a class="tag tag-mention" data-mention="${content}">loading...</a>`;
    } else if (tagMode === "topic" /* && !content.match(/\s/) */) {
      // for topic, space is not allowed.
      // return `<a class="tag tag-topic" data-topic="${content}">loading...</a>`;
      return `<a class="tag tag-topic" data-topic="${content}">${
        content.match(/\s/) ? `#${content}#` : `#${content}`
      }</a>`;
    } else {
      return `<a class="tag tag-error"  data-error="Invalid tag">loading...</a>`;
    }
  };
}
