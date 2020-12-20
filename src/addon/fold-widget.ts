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
  FoldStream,
} from "./fold";
import { Attributes } from "./attributes/index";
import { registerWidgetCreator, getWidgetCreator } from "../widget/index";
import { TextMarker } from "codemirror";

import { HelloWidget } from "../widget/hello/hello";
registerWidgetCreator("hello", HelloWidget);

// import { BoxWidget } from "../widget/box/box";
// registerWidgetCreator("box", BoxWidget);

export const WidgetFolder = function (
  stream: FoldStream,
  token: CodeMirror.Token
): any {
  if (
    !token.type ||
    token.type.indexOf("comment") < 0 ||
    !token.string.trim().match(/^<!--\s*@/) ||
    !token.string.trim().match(/-->$/)
  ) {
    return null;
  }
  let start = token.start;
  let end = token.end;
  const cm = stream.cm;
  const str = token.string
    .replace(/^<!--\s*/, "")
    .replace(/-->$/, "")
    .trim();

  let widgetName: string;
  let widgetAttributes: Attributes = {};
  const firstSpaceMatch = str.match(/\s/);
  const firstSpace = firstSpaceMatch ? firstSpaceMatch.index : -1;
  if (firstSpace > 0) {
    widgetName = str.slice(0, firstSpace).trim().replace(/^@/, "");
    try {
      const j = str.slice(firstSpace + 1).trim();
      if (j[0] === "{") {
        widgetAttributes = JSON.parse(
          j
            .replace(/-\\->/g, "-->")
            .replace(/<!\\--/g, "<!--")
            .replace(/\\\|/g, "|")
        );
      } else {
        widgetAttributes = JSON.parse(
          "{" +
            j
              .replace(/-\\->/g, "-->")
              .replace(/<!\\--/g, "<!--")
              .replace(/\\\|/g, "|") +
            "}"
        );
      }
    } catch (error) {
      throw error;
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
    const pos = marker.find();
    if (!pos) {
      return;
    }
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
    editor.replaceRange(
      `<!-- ${widgetName} ${attributesStr
        .replace(/^{/, "")
        .replace(/}$/, "")
        .replace(/-->/g, "-\\->")
        .replace(/<!--/g, "<!\\--")} -->`.replace(/\|/g, "\\|"),
      widgetFrom,
      widgetTo
    );
  };

  const replaceSelf = (inputString: string) => {
    const editor = cm;
    if (!editor || !marker) {
      return;
    }
    const pos = marker.find();
    if (!pos) {
      return;
    }
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
  let markerArgs: CodeMirror.TextMarkerOptions;
  const widgetCreator = getWidgetCreator(widgetName);
  if (!widgetCreator) {
    return false;
  } else {
    [widget, markerArgs] = widgetCreator({
      editor: cm,
      attributes: widgetAttributes,
      setAttributes: setAttributes,
      removeSelf: removeSelf,
      replaceSelf: replaceSelf,
      isPreview: false,
    });
  }

  // Create widget here
  marker = cm.markText(from, to, {
    replacedWith: widget,
    ...markerArgs,
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
