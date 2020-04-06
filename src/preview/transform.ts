// Modified from github.com/shd101wyy/mume

import { parseAttributes } from "../addon/fold";
import HeadingIdGenerator from "./heading-id-generator";
import { CustomSubjects } from "./custom-subjects";

function createAnchor(lineNo) {
  return `\n\n<p data-line="${lineNo}" class="sync-line" style="margin:0;"></p>\n\n`;
}

export interface HeadingData {
  content: string;
  level: number;
  id: string;
}

export interface TransformMarkdownOutput {
  /**
   * An array of slide configs.
   */
  slideConfigs: object[];

  /**
   * whehter we found [TOC] in markdown file or not.
   */
  tocBracketEnabled: boolean;

  /**
   * An array of headings data
   */
  headings: HeadingData[];

  /**
   * Get `---\n...\n---\n` string.
   */
  frontMatterString: string;

  /**
   * Transformed markdown string
   */
  outputString: string;
}

export interface TransformMarkdownOptions {
  forPreview: boolean;
  headingIdGenerator?: HeadingIdGenerator;
  forMarkdownExport?: boolean;
  usePandocParser?: boolean;
}

const fileExtensionToLanguageMap = {
  vhd: "vhdl",
  erl: "erlang",
  dot: "dot",
  gv: "dot",
  viz: "dot",
};

const selfClosingTag = {
  area: 1,
  base: 1,
  br: 1,
  col: 1,
  command: 1,
  embed: 1,
  hr: 1,
  img: 1,
  input: 1,
  keygen: 1,
  link: 1,
  meta: 1,
  param: 1,
  source: 1,
  track: 1,
  wbr: 1,
};

export function transformMarkdown(
  inputString: string,
  {
    forPreview = false,
    headingIdGenerator = new HeadingIdGenerator(),
    forMarkdownExport = false,
    usePandocParser = false,
  }: TransformMarkdownOptions
) {
  let lastOpeningCodeBlockFence: string = null;
  let codeChunkOffset = 0;

  const slideConfigs = [];
  const headings: HeadingData[] = [];
  let tocBracketEnabled = false;
  let frontMatterString = "";

  function helper(i, lineNo = 0): TransformMarkdownOutput {
    let outputString = "";

    while (i < inputString.length) {
      if (inputString[i] === "\n") {
        // return helper(i+1, lineNo+1, outputString+'\n')
        i = i + 1;
        lineNo = lineNo + 1;
        outputString = outputString + "\n";
        continue;
      }

      let end = inputString.indexOf("\n", i);
      if (end < 0) {
        end = inputString.length;
      }
      let line = inputString.substring(i, end);

      const inCodeBlock = !!lastOpeningCodeBlockFence;

      const currentCodeBlockFence = (line.match(/^[`]{3,}/) || [])[0];
      if (currentCodeBlockFence) {
        if (!inCodeBlock && forPreview) {
          outputString += createAnchor(lineNo);
        }

        const containsCmd = !!line.match(/\"?cmd\"?\s*[:=\s}]/);
        if (!inCodeBlock && containsCmd) {
          // it's code chunk, so mark its offset
          line = line.replace("{", `{code_chunk_offset=${codeChunkOffset}, `);
          codeChunkOffset++;
        }
        if (!inCodeBlock) {
          lastOpeningCodeBlockFence = currentCodeBlockFence;
        } else if (
          currentCodeBlockFence.length >= lastOpeningCodeBlockFence.length
        ) {
          lastOpeningCodeBlockFence = null;
        }

        // return helper(end+1, lineNo+1, outputString+line+'\n')
        i = end + 1;
        lineNo = lineNo + 1;
        outputString = outputString + line + "\n";
        continue;
      }

      if (inCodeBlock) {
        // return helper(end+1, lineNo+1, outputString+line+'\n')
        i = end + 1;
        lineNo = lineNo + 1;
        outputString = outputString + line + "\n";
        continue;
      }

      let headingMatch;
      let taskListItemMatch;
      let htmlTagMatch;

      /*
        // I changed this because for case like:
        * haha
        ![](image.png)
        The image will not be displayed correctly in preview as there will be `anchor` inserted
        between...
        */
      if (
        line.match(/^(\!\[|@import)/) &&
        inputString[i - 1] === "\n" &&
        inputString[i - 2] === "\n"
      ) {
        if (forPreview) {
          outputString += createAnchor(lineNo); // insert anchor for scroll sync
        }
        /* tslint:disable-next-line:no-conditional-assignment */
      } else if ((headingMatch = line.match(/^(\#{1,7})\s+.*/))) {
        /* ((headingMatch = line.match(/^(\#{1,7})(.+)$/)) ||
                  // the ==== and --- headers don't work well. For example, table and list will affect it, therefore I decide not to support it.
                  (inputString[end + 1] === '=' && inputString[end + 2] === '=') ||
                  (inputString[end + 1] === '-' && inputString[end + 2] === '-')) */ // headings

        if (forPreview) {
          outputString += createAnchor(lineNo);
        }
        let heading;
        let level;
        let tag;
        heading = line.replace(headingMatch[1], "");
        tag = headingMatch[1];
        level = tag.length;

        // check {class:string, id:string, ignore:boolean}
        const optMatch = heading.match(/(\s+\{|^\{)(.+?)\}(\s*)$/);
        let classes = "";
        let id = "";
        let ignore = false;
        let opt;
        if (optMatch) {
          heading = heading.replace(optMatch[0], "");

          try {
            opt = parseAttributes(optMatch[0]);

            (classes = opt["class"]),
              (id = opt["id"]),
              (ignore = opt["ignore"]);
            delete opt["class"];
            delete opt["id"];
            delete opt["ignore"];
          } catch (e) {
            heading = "OptionsError: " + optMatch[1];
            ignore = true;
          }
        }

        if (!id) {
          id = headingIdGenerator.generateId(heading);
        }

        if (!ignore) {
          headings.push({ content: heading, level, id });
        }

        if (usePandocParser) {
          // pandoc
          let optionsStr = "{";
          if (id) {
            optionsStr += `#${id} `;
          }
          if (classes) {
            optionsStr += "." + classes.replace(/\s+/g, " .") + " ";
          }
          if (opt) {
            for (const key in opt) {
              if (typeof opt[key] === "number") {
                optionsStr += " " + key + "=" + opt[key];
              } else {
                optionsStr += " " + key + '="' + opt[key] + '"';
              }
            }
          }
          optionsStr += "}";

          // return helper(end+1, lineNo+1, outputString + `${tag} ${heading} ${optionsStr}` + '\n')
          i = end + 1;
          lineNo = lineNo + 1;
          outputString =
            outputString + `${tag} ${heading} ${optionsStr}` + "\n";
          continue;
        } else {
          // markdown-it
          if (!forMarkdownExport) {
            // convert to <h? ... ></h?>
            line = `${tag} ${heading}\n<p class="mume-header ${classes}" id="${id}"></p>`;
          } else {
            line = `${tag} ${heading}`;
          }

          // return helper(end+1, lineNo+1, outputString + line + '\n\n')
          i = end + 1;
          lineNo = lineNo + 1;
          outputString = outputString + line + "\n\n";
          continue;
          // I added one extra `\n` here because remarkable renders content below
          // heading differently with `\n` and without `\n`.
        }
      } else if (line.match(/^\<!--/)) {
        // custom comment
        if (forPreview) {
          outputString += createAnchor(lineNo);
        }
        let commentEnd = inputString.indexOf("-->", i + 4);

        if (commentEnd < 0) {
          // didn't find -->
          // return helper(inputString.length, lineNo+1, outputString+'\n')
          i = inputString.length;
          lineNo = lineNo + 1;
          outputString = outputString + "\n";
          continue;
        } else {
          commentEnd += 3;
        }

        const subjectMatch = line.match(/^\<!--\s+([^\s]+)/);
        if (!subjectMatch) {
          const content = inputString.slice(i + 4, commentEnd - 3).trim();
          const newlinesMatch = content.match(/\n/g);
          const newlines = newlinesMatch ? newlinesMatch.length : 0;

          // return helper(commentEnd, lineNo + newlines, outputString + '\n')
          i = commentEnd;
          lineNo = lineNo + newlines;
          outputString = outputString + "\n";
          continue;
        } else {
          const subject = subjectMatch[1];
          if (subject === "@import") {
            const commentEnd2 = line.lastIndexOf("-->");
            if (commentEnd2 > 0) {
              line = line.slice(4, commentEnd2).trim();
            }
          } else if (subject in CustomSubjects) {
            const content = inputString.slice(i + 4, commentEnd - 3).trim();
            const newlinesMatch = content.match(/\n/g);
            const newlines = newlinesMatch ? newlinesMatch.length : 0;
            const optionsMatch = content.match(/^([^\s]+?)\s([\s\S]+)$/);

            let options = {};
            if (optionsMatch && optionsMatch[2]) {
              options = parseAttributes(optionsMatch[2]);
            }
            options["lineNo"] = lineNo;

            if (subject === "pagebreak" || subject === "newpage") {
              // pagebreak
              // return helper(commentEnd, lineNo + newlines, outputString + '<div class="pagebreak"> </div>\n')
              i = commentEnd;
              lineNo = lineNo + newlines;
              outputString =
                outputString +
                '<div class="pagebreak html2pdf__page-break"> </div>\n';
              continue;
            } else if (subject.match(/^\.?slide\:?$/)) {
              // slide
              slideConfigs.push(options);
              if (forMarkdownExport) {
                // return helper(commentEnd, lineNo + newlines, outputString + `<!-- ${content} -->` + '\n')
                i = commentEnd;
                lineNo = lineNo + newlines;
                outputString = outputString + `<!-- ${content} -->` + "\n";
                continue;
              } else {
                // return helper(commentEnd, lineNo + newlines, outputString + '\n[MUMESLIDE]\n\n')
                i = commentEnd;
                lineNo = lineNo + newlines;
                outputString = outputString + "\n[MUMESLIDE]\n\n";
                continue;
              }
            }
          } else {
            const content = inputString.slice(i + 4, commentEnd - 3).trim();
            const newlinesMatch = content.match(/\n/g);
            const newlines = newlinesMatch ? newlinesMatch.length : 0;
            // return helper(commentEnd, lineNo + newlines, outputString + '\n')
            i = commentEnd;
            lineNo = lineNo + newlines;
            outputString = outputString + `<!-- ${content} -->\n`;
            continue;
          }
        }
      } else if (line.match(/^\s*\[toc\]\s*$/i)) {
        // [TOC]
        if (forPreview) {
          outputString += createAnchor(lineNo); // insert anchor for scroll sync
        }
        tocBracketEnabled = true;
        // return helper(end+1, lineNo+1, outputString + `\n[MUMETOC]\n\n`)
        i = end + 1;
        lineNo = lineNo + 1;
        outputString = outputString + `\n[MUMETOC]\n\n`;
        continue;
      } else if (
        /* tslint:disable-next-line:no-conditional-assignment */
        (taskListItemMatch = line.match(
          /^\s*(?:[*\-+]|\d+\.)\s+(\[[xX\s]\])\s/
        ))
      ) {
        // task list
        const checked = taskListItemMatch[1] !== "[ ]";
        if (!forMarkdownExport) {
          line = line.replace(
            taskListItemMatch[1],
            `<input type="checkbox" class="task-list-item-checkbox${
              forPreview ? " sync-line" : ""
            }" ${forPreview ? `data-line="${lineNo}"` : ""}${
              checked ? " checked" : ""
            }>`
          );
        }
        // return helper(end+1, lineNo+1, outputString+line+`\n`)
        i = end + 1;
        lineNo = lineNo + 1;
        outputString = outputString + line + `\n`;
        continue;
      } else if (
        /* tslint:disable-next-line:no-conditional-assignment */
        (htmlTagMatch = line.match(
          /^\s*<(?:([a-zA-Z]+)|([a-zA-Z]+)\s+(?:.+?))>/
        ))
      ) {
        // escape html tag like <pre>
        const tagName = htmlTagMatch[1] || htmlTagMatch[2];
        if (!(tagName in selfClosingTag)) {
          const closeTagName = `</${tagName}>`;
          const end2 = inputString.indexOf(
            closeTagName,
            i + htmlTagMatch[0].length
          );
          if (end2 < 0) {
            // HTML error. Tag not closed
            // Do Nothing here. Reason:
            //     $$ x
            //     <y>
            //     $$
            /*
              i = inputString.length
              lineNo = lineNo + 1
              outputString = outputString + `\n\`\`\`\nHTML error. Tag <${tagName}> not closed. ${closeTagName} is required.\n\`\`\`\n\n`
              continue
              */
          } else {
            const htmlString = inputString.slice(i, end2 + closeTagName.length);
            const newlinesMatch = htmlString.match(/\n/g);
            const newlines = newlinesMatch ? newlinesMatch.length : 0;

            // return helper(commentEnd, lineNo + newlines, outputString + '\n')
            i = end2 + closeTagName.length;
            lineNo = lineNo + newlines;
            outputString = outputString + htmlString;
            continue;
          }
        }
      }

      // return helper(end+1, lineNo+1, outputString+line+'\n')
      i = end + 1;
      lineNo = lineNo + 1;
      outputString = outputString + line + "\n";
      continue;
    }

    // done
    return {
      outputString,
      slideConfigs,
      headings,
      frontMatterString,
      tocBracketEnabled,
    };
  }
  let endFrontMatterOffset = 0;
  if (
    inputString.startsWith("---") &&
    /* tslint:disable-next-line:no-conditional-assignment */
    (endFrontMatterOffset = inputString.indexOf("\n---")) > 0
  ) {
    frontMatterString = inputString.slice(0, endFrontMatterOffset + 4);
    return helper(
      frontMatterString.length,
      frontMatterString.match(/\n/g).length
    );
  } else {
    return helper(0, 0);
  }
}
