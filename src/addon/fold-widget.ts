/**
 * 0xGG Team
 *
 * DESCRIPTION: Inline code fold that aims to get VickyWidgets work `@appname arg1=val1 arg2=val2`
 */

import {
  FolderFunc,
  registerFolder,
  breakMark,
  RequestRangeResult
} from "./fold";
import { Attributes, parseAttributes } from "./attributes/index";
import { TimerWidget } from "../widget/timer";
import { BilibiliWidget } from "../widget/bilibili";

export const WidgetFolder: FolderFunc = function(stream, token) {
  if (token.type !== "inline-code" || !token.string.trim().startsWith("@")) {
    return null;
  }
  const start = token.start;
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
      widgetAttributes = JSON.parse(
        "{" + str.slice(firstSpace + 1).trim() + "}"
      );
    } catch (error) {
      widgetAttributes = {};
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

  // Create the widget
  let widget: HTMLElement;
  if (widgetName === "timer") {
    widget = TimerWidget(widgetAttributes);
  } else if (widgetName === "bilibili") {
    widget = BilibiliWidget(widgetAttributes);
  } else {
    return false;
  }

  // Create widget here
  const marker = cm.markText(from, to, {
    replacedWith: widget
  });

  // 1 here means `
  widget.addEventListener("click", () => breakMark(cm, marker, 1), false);
  return marker;
};

registerFolder("widget", WidgetFolder, true);

/*
example widget:

    `@timer "date":"Tue Dec 10 2019 10:54:07 GMT+0800 (China Standard Time)"`
*/
