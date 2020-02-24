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

  // Include "`"
  start = start - 1;
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
        widgetAttributes = JSON.parse(j);
      } else {
        widgetAttributes = JSON.parse("{" + j + "}");
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

  const setAttributes = (attributes: Attributes) => {
    const editor = cm;
    if (!editor) {
      return;
    }
    let widgetFrom: CodeMirror.Position = { line: from.line, ch: from.ch };
    let widgetTo: CodeMirror.Position = { line: to.line, ch: to.ch };
    const line = editor.getLine(from.line);
    if (!line) {
      throw new Error("Failed to update widget attributes");
    }
    let end = widgetFrom.ch + 1;
    for (; end < line.length; end++) {
      if (line[end - 1] !== "\\" && line[end] === "`") {
        end++;
        break;
      }
    }
    widgetTo.ch = end;

    const widgetName = line
      .slice(widgetFrom.ch + 1, widgetTo.ch)
      .match(/^\@[^\s$`]+/)[0];
    editor.replaceRange(
      `\`${widgetName} ${JSON.stringify(attributes)
        .replace(/^{/, "")
        .replace(/}$/, "")}\``,
      widgetFrom,
      widgetTo
    );
  };

  const replaceSelf = (inputString: string) => {
    const editor = cm;
    if (!editor) {
      return;
    }
    let widgetFrom: CodeMirror.Position = { line: from.line, ch: from.ch };
    let widgetTo: CodeMirror.Position = { line: to.line, ch: to.ch };
    const line = editor.getLine(from.line);
    if (!line) {
      throw new Error("Failed to update widget attributes");
    }
    let end = widgetFrom.ch + 1;
    for (; end < line.length; end++) {
      if (line[end - 1] !== "\\" && line[end] === "`") {
        end++;
        break;
      }
    }
    widgetTo.ch = end;
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
      attributes: widgetAttributes,
      setAttributes: setAttributes,
      removeSelf: removeSelf,
      replaceSelf: replaceSelf,
      isPreview: false
    });
  }

  // Create widget here
  const marker = cm.markText(from, to, {
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
