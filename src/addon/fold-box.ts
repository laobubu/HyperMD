import * as CodeMirror from "codemirror";
import { Addon, suggestedEditorConfig } from "../core";
import { cm_t } from "../core/type";

import {
  FolderFunc,
  registerFolder,
  getAddon as getFoldAddon,
  FoldStream,
  RequestRangeResult,
  breakMark,
  parseAttributes,
  Attributes
} from "./fold";

import { RenderBox } from "../component/Box"

export interface FoldInfo {
  readonly lang: string;
  readonly attributes: Attributes;

  readonly editor: cm_t;
  readonly marker: CodeMirror.TextMarker;
  readonly el: HTMLElement;
}

/**
 * A BoxRenderer turns code into flow chart / playground sandbox etc,
 * returning the rendered HTML element.
 *
 * 1. the BoxRenderer can set `info.onRemove` and `info.onUpdate` callbacks
 * 2. if rendered element's dimension is changed, you must call `info.changed()`
 * 3. do NOT use destructuring assignment with `info` !!!
 */
export type BoxRenderer = (
  code: string,
  info: FoldInfo
) => {
  element: HTMLElement;
};

export const BoxFolder: FolderFunc = (stream, token) => {
  if (
    token.start !== 0 ||
    !token.type ||
    token.type.indexOf("dgit-box-begin") === -1
  ) {
    return null;
  }
  return getAddon(stream.cm).fold(stream, token);
};

registerFolder("box", BoxFolder, true);

//#endregion

/********************************************************************************** */
//#region Addon Options

export type Options = Record<string, boolean>;

export const defaultOption: Options = {
  /* will be populated by registerRenderer() */
};

export const suggestedOption: Options = {
  /* will be populated by registerRenderer() */
};

export type OptionValueType = Options | boolean;

declare global {
  namespace HyperMD {
    interface EditorConfiguration {
      hmdFoldBox?: OptionValueType;
    }
  }
}

suggestedEditorConfig.hmdFoldBox = suggestedOption;

CodeMirror.defineOption("hmdFoldBox", defaultOption, function(
  cm: cm_t,
  newVal: OptionValueType
) {
  if (!newVal || typeof newVal === "boolean") {
    newVal = newVal ? suggestedOption : defaultOption;
  }

  var inst = getAddon(cm);
  for (var k in defaultOption) {
    inst[k] = k in newVal ? newVal[k] : defaultOption[k];
  }
});

export class FoldBox implements Addon.Addon {
  constructor(public cm: cm_t) {}

  fold(stream: FoldStream, token: CodeMirror.Token): CodeMirror.TextMarker {
    if (
      token.start !== 0 ||
      !token.type ||
      token.type.indexOf("dgit-box-begin") === -1
    ) {
      return null;
    }
    var tmp = /([-\w]+)(\s*|\s+\{.+\}\s*)$/.exec(token.string);
    var lang = tmp && tmp[1].toLowerCase();
    let attributesStr = tmp && tmp[2] && tmp[2].trim();
    let attributes = {};
    if (attributesStr && attributesStr.length) {
      attributes = parseAttributes(attributesStr);
      try {
      } catch (error) {
        attributes = {};
      }
    }
    if (!lang) return null;

    let renderer: BoxRenderer;

    var cm = this.cm;
    let from: CodeMirror.Position = { line: stream.lineNo, ch: 0 };
    let to: CodeMirror.Position = null;

    // find the end of code block

    let lastLineCM = cm.lastLine();
    let endLine = stream.lineNo + 1;
    do {
      let s = cm.getTokenAt({ line: endLine, ch: 1 });
      if (s && s.type && s.type.indexOf("dgit-box-end") !== -1) {
        //FOUND END!
        to = { line: endLine, ch: s.end };
        break;
      }
    } while (++endLine < lastLineCM);

    if (!to) return null;

    // request the range

    let rngReq = stream.requestRange(from, to);
    if (rngReq !== RequestRangeResult.OK) return null;

    let code = cm.getRange(
      { line: from.line + 1, ch: 0 },
      { line: to.line, ch: 0 }
    );
    tmp = /^\/box-?(info|success|warning|danger)?/.exec(token.string);
    const type = (tmp && tmp[1]) || "info"
    const el = RenderBox({code, lang, from, type});

    const marker = cm.markText(from, to, {
      inclusiveLeft: true,
      inclusiveRight: true,
      replacedWith: el,
    });
    let fromCursor = null;
    marker.on("beforeCursorEnter", function() {
      fromCursor = (cm.getCursor().line <= from.line);
      marker.clear();
    })
    marker.on("clear", function(from, to) {
      if (fromCursor === true) cm.setCursor(from);
    })
    return marker
  }
}

export const getAddon = Addon.Getter(
  "FoldBox",
  FoldBox,
  defaultOption /** if has options */
);
declare global {
  namespace HyperMD {
    interface HelperCollection {
      FoldBox?: FoldBox;
    }
  }
}



