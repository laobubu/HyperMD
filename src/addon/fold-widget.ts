/**
 * 0xGG Team
 * Distributed under AGPL3
 *
 * DESCRIPTION: Inline code fold that aims to get VickyWidgets work `@appname arg1=val1 arg2=val2`
 */

import {
  FolderFunc,
  registerFolder,
  breakMark,
  RequestRangeResult,
  FoldStream
} from "./fold";
import { Attributes } from "./attributes/index";
import { registerWidgetCreator, getWidgetCreator } from "../widget/index";
import { HelloWidget } from "../widget/hello/hello";
import { ErrorWidget } from "../widget/error/error";
import { TimerWidget } from "../widget/timer/timer";
import { TextMarker } from "codemirror";

registerWidgetCreator("hello", HelloWidget);
registerWidgetCreator("error", ErrorWidget);
registerWidgetCreator("timer", TimerWidget);

export const WidgetFolder = function(
  stream: FoldStream,
  token: CodeMirror.Token
): any {
  if (token.type !== "inline-code" || !token.string.trim().startsWith("@")) {
    return null;
  }
  let start = token.start;
  const cm = stream.cm;
  const line = cm.getLine(stream.lineNo);
  let end = token.end;
  // TODO: variable `end` here might be wrong
  // TODO: Support multiple line inline_code
  for (; end < line.length; end++) {
    if (line[end] === "`" && line[end - 1] !== "\\") {
      break;
    }
  }
  const str = line.slice(start, end).trim();
  while (line[end + 1] === "`") {
    end++;
  }
  while (line[start - 1] === "`") {
    start--;
  }
  // Include "`"
  end = end + 1;

  let widgetName: string;
  let widgetAttributes: Attributes = {};
  const firstSpaceMatch = str.match(/\s/);
  const firstSpace = firstSpaceMatch ? firstSpaceMatch.index : -1;
  if (firstSpace > 0) {
    widgetName = str
      .slice(0, firstSpace)
      .trim()
      .replace(/^@/, "");
    try {
      const j = str.slice(firstSpace + 1).trim();
      if (j[0] === "{") {
        widgetAttributes = JSON.parse(j.replace(/\\`/g, "`"));
      } else {
        widgetAttributes = JSON.parse("{" + j.replace(/\\`/g, "`") + "}");
      }
    } catch (error) {
      widgetName = "error";
      widgetAttributes = { message: error.toString() };
    }
  } else {
    widgetName = str.trim().replace(/^@/, "");
  }
  if (!widgetName) {
    return null;
  }
  /*
  console.log("stream: ", stream);
  console.log("token: ", token);
  console.log("str: ", str);
  console.log("widgetName: ", widgetName);
  console.log("widgetAttributes: ", widgetAttributes);
  */

  const from: CodeMirror.Position = { line: stream.lineNo, ch: start };
  const to: CodeMirror.Position = { line: stream.lineNo, ch: end };

  const reqAns = stream.requestRange(from, to);
  if (reqAns !== RequestRangeResult.OK) return null;

  let marker: TextMarker = null;
  const setAttributes = (attributes: Attributes) => {
    const editor = cm;
    if (!editor || !marker) {
      return;
    }
    let pos = marker.find();
    let widgetFrom: CodeMirror.Position = pos.from;
    let widgetTo: CodeMirror.Position = pos.to;
    const line = editor.getLine(widgetFrom.line);
    if (!line) {
      throw new Error("Failed to update widget attributes");
    }
    const widgetName = line
      .slice(widgetFrom.ch, widgetTo.ch)
      .match(/\@[^\s$`]+/)[0];

    const attributesStr = JSON.stringify(attributes);
    if (attributesStr.indexOf("`") > 0) {
      editor.replaceRange(
        `\`\`${widgetName} ${attributesStr
          .replace(/`/g, "\\`")
          .replace(/^{/, "")
          .replace(/}$/, "")}\`\``,
        widgetFrom,
        widgetTo
      );
    } else {
      editor.replaceRange(
        `\`${widgetName} ${attributesStr
          .replace(/^{/, "")
          .replace(/}$/, "")}\``,
        widgetFrom,
        widgetTo
      );
    }
  };

  const replaceSelf = (inputString: string) => {
    const editor = cm;
    if (!editor || !marker) {
      return;
    }
    const pos = marker.find();
    let widgetFrom: CodeMirror.Position = pos.from;
    let widgetTo: CodeMirror.Position = pos.to;
    const line = editor.getLine(widgetFrom.line);
    if (!line) {
      throw new Error("Failed to update widget attributes");
    }
    editor.replaceRange(inputString, widgetFrom, widgetTo);
    editor.focus();
  };

  const removeSelf = () => {
    return replaceSelf("");
  };

  // Create the widget
  let widget: HTMLElement;
  const widgetCreator = getWidgetCreator(widgetName);
  if (!widgetCreator) {
    return false;
  } else {
    widget = widgetCreator({
      editor: cm,
      attributes: widgetAttributes,
      setAttributes: setAttributes,
      removeSelf: removeSelf,
      replaceSelf: replaceSelf,
      isPreview: false
    });
  }

  // Create widget here
  marker = cm.markText(from, to, {
    replacedWith: widget,
    collapsed: true,
    inclusiveLeft: true,
    inclusiveRight: true
  });

  /*
  // 1 here means `
  widget.addEventListener("click", () => {
    breakMark(cm, marker, 1), false;
  });
  */
  return marker;
};

registerFolder("widget", WidgetFolder, true);

/*
example widget:

    `@timer "date":"Tue Dec 10 2019 10:54:07 GMT+0800 (China Standard Time)"`
*/
