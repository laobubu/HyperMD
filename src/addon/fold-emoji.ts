// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
//
// DESCRIPTION: Fold and render emoji :smile:
//

import * as CodeMirror from "codemirror";
import { Position } from "codemirror";
import { Addon, suggestedEditorConfig } from "../core";
import { cm_t } from "../core/type";
import {
  registerFolder,
  breakMark,
  FolderFunc,
  RequestRangeResult
} from "./fold";
import EmojiDefinitions from "./emoji/index";

/********************************************************************************** */

export type EmojiRenderer = (text: string) => HTMLElement;
export type EmojiChecker = (text: string) => boolean;

export const defaultDict: Record<string, string> = {
  /* initialized later */
};
export const defaultChecker: EmojiChecker = text => text in defaultDict;
export const defaultRenderer: EmojiRenderer = text => {
  const el = document.createElement("span");
  const el1 = document.createElement("span");
  el1.className = "hmd-emoji-text"
  el1.innerText = text
  const el2 = document.createElement("span");
  el2.className = "hmd-emoji-img"
  el2.textContent = defaultDict[text];
  el2.title = text;
  el.appendChild(el1)
  el.appendChild(el2)
  return el;
};

/********************************************************************************** */
//#region Folder
/**
 * Detect if a token is emoji and fold it
 *
 * @see FolderFunc in ./fold.ts
 */
export const EmojiFolder: FolderFunc = (stream, token) => {
  if (!token.type || !/ formatting-emoji/.test(token.type)) return null;

  const cm = stream.cm;
  const from: Position = { line: stream.lineNo, ch: token.start };
  const to: Position = { line: stream.lineNo, ch: token.end };

  var name = token.string; // with ":"
  var addon = getAddon(cm);
  if (!addon.isEmoji(name)) return null;

  const reqAns = stream.requestRange(from, to);
  if (reqAns !== RequestRangeResult.OK) return null;

  // now we are ready to fold and render!

  var marker = addon.foldEmoji(name, from, to);
  return marker;
};
//#endregion

registerFolder("emoji", EmojiFolder, true);

/********************************************************************************** */
//#region Addon Options

export interface Options extends Addon.AddonOptions {
  /**
   * you may add your custom emojis, which have higher priority than standard emojis
   *
   * @example { ":doge:": a_function_that_creates_doge_img_element }
   */
  myEmoji: { [name: string]: EmojiRenderer };

  /**
   * Tired of plain text? You may provide a EmojiRenderer function,
   * which generates a HTML Element (eg. emoji image from twemoji or emojione)
   * for standard emojis.
   *
   * Note that if EmojiRenderer returns null, the folding process will be aborted.
   */
  emojiRenderer: EmojiRenderer;

  /**
   * Check if a emoji text , eg. `:smile:` , is valid
   */
  emojiChecker: EmojiChecker;
}

export const defaultOption: Options = {
  myEmoji: {},
  emojiRenderer: defaultRenderer,
  emojiChecker: defaultChecker
};

export const suggestedOption: Partial<Options> = {};

export type OptionValueType = Partial<Options>;

declare global {
  namespace HyperMD {
    interface EditorConfiguration {
      /**
       * **NOTE**: to stop folding emojis, please modify `hmdFold.emoji` instead.
       *
       * `hmdFoldEmoji` is options for EmojiFolder, which also accepts
       *
       * - **EmojiRenderer** function
       * - **string**: name of a emoji renderer (see emojiRenderer)
       */
      hmdFoldEmoji?: OptionValueType;
    }
  }
}

suggestedEditorConfig.hmdFoldEmoji = suggestedOption;

CodeMirror.defineOption("hmdFoldEmoji", defaultOption, function(
  cm: cm_t,
  newVal: OptionValueType
) {
  ///// convert newVal's type to `Partial<Options>`, if it is not.

  if (!newVal) {
    newVal = {};
  }

  ///// apply config and write new values into cm

  var inst = getAddon(cm);
  for (var k in defaultOption) {
    inst[k] = k in newVal ? newVal[k] : defaultOption[k];
  }
});

//#endregion

/********************************************************************************** */
//#region Addon Class

export class FoldEmoji implements Addon.Addon, Options {
  myEmoji: { [name: string]: EmojiRenderer };
  emojiRenderer: EmojiRenderer;
  emojiChecker: EmojiChecker;

  constructor(public cm: cm_t) {
    // options will be initialized to defaultOption when constructor is finished
  }

  isEmoji(text: string) {
    return text in this.myEmoji || this.emojiChecker(text);
  }

  foldEmoji(text: string, from: CodeMirror.Position, to: CodeMirror.Position) {
    var cm = this.cm;
    var el =
      (text in this.myEmoji && this.myEmoji[text](text)) ||
      this.emojiRenderer(text);

    if (!el || !el.tagName) return null;

    var marker = cm.markText(from, to, {
      replacedWith: el,
    });
    marker.widgetNode.className += " hmd-emoji";

    el.addEventListener("click", breakMark.bind(this, cm, marker, 1), false);

    if (el.tagName.toLowerCase() === "img") {
      el.addEventListener("load", () => marker.changed(), false);
      el.addEventListener("dragstart", ev => ev.preventDefault(), false);
    }

    return marker;
  }
}

//#endregion

/** ADDON GETTER (Singleton Pattern): a editor can have only one FoldEmoji instance */
export const getAddon = Addon.Getter(
  "FoldEmoji",
  FoldEmoji,
  defaultOption /** if has options */
);
declare global {
  namespace HyperMD {
    interface HelperCollection {
      FoldEmoji?: FoldEmoji;
    }
  }
}

/********************************************************************************** */

//#region initialize compact emoji dict
(function(dest: typeof defaultDict) {
  for (const key in EmojiDefinitions) {
    dest[`:${key}:`] = EmojiDefinitions[key];
  }
})(defaultDict);
//#endregion

