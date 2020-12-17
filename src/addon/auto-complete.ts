// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
//
// DESCRIPTION: Load code highlighting modes (aka. profiles) automatically
//

import * as CodeMirror from "codemirror";
import { Addon, FlipFlop, suggestedEditorConfig } from "../core";
import { cm_t } from "../core/type";
import { defaultDict } from "../addon/fold-emoji";

export interface Options extends Addon.AddonOptions {};
export const defaultOption: Options = {};
export const suggestedOption: Partial<Options> = {};
export type OptionValueType = Partial<Options>;

declare global {
  namespace HyperMD {
    interface EditorConfiguration {
      hmdAutoComplete?: OptionValueType;
    }
  }
}
suggestedEditorConfig.hmdAutoComplete = suggestedOption;

CodeMirror.defineOption("hmdAutoComplete", defaultOption, function(
  cm: cm_t,
  newVal: OptionValueType
) {
  var inst = getAddon(cm);
  for (var k in defaultOption) {
    inst[k] = k in newVal ? newVal[k] : defaultOption[k];
  }
});

export class AutoComplete implements Addon.Addon, Options {
  constructor(public cm: cm_t) {
    cm.on('change', emojiComplete)
  }
}

export const getAddon = Addon.Getter(
  "AutoComplete",
  AutoComplete,
  defaultOption /** if has options */
);

let emojiList = []
for (let key in defaultDict) {
  emojiList.push({
    text: `${key}`,
    render: (element) => {
      element.innerHTML = `${defaultDict[key]} ${key}`
    }
  })
}

const emojiComplete = function(cm) {
  CodeMirror.showHint(cm, function() {
    const cur = cm.getCursor(), token = cm.getTokenAt(cur)
    const line = cur.line
    const lineStr = cm.getLine(line);
    const start = token.start, end = cur.ch;
    var filteredList = [];
    var currentWord = "";
    if (start <= 0) return;
    if (lineStr.substr(start - 1, 1) == ":") {
      currentWord = ":" + token.string;
      filteredList = emojiList.filter((item) => {
        return item.text.indexOf(currentWord) == 0 ? true : false
      })
    }
    if (filteredList.length >= 1) {
      return {
        list: filteredList,
        from: CodeMirror.Pos(line, start - 1),
        to: CodeMirror.Pos(line, end)
      }
    }
  }, { completeSingle: false })
}
