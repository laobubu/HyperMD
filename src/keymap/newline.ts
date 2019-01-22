// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
//
// powerful keymap for HyperMD and Markdown modes
//

import * as CodeMirror from "codemirror";
import { repeatStr, repeat } from "../core";
import { HyperMDState } from "../mode/hypermd";
import { cm_t } from "../core/type";

/** insert "\n" , or if in list, insert "\n" + indentation */
function newline(cm: cm_t) {
  if (cm.getOption("disableInput")) return CodeMirror.Pass

  const selections = cm.listSelections()
  var replacements: string[] = repeat("\n", selections.length)

  for (let i = 0; i < selections.length; i++) {
    var range = selections[i]
    var pos = range.head
    const eolState = cm.getStateAfter(pos.line) as HyperMDState

    if (eolState.list !== false) {
      replacements[i] += repeatStr(" ", eolState.listStack.slice(-1)[0])
    }
  }

  cm.replaceSelections(replacements)
}

export default newline;
