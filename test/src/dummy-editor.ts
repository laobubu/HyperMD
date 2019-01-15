import * as CodeMirror from "codemirror"

import { suggestedEditorConfig } from "hypermd/core"
import "hypermd/mode/hypermd"

import { cm_t } from "hypermd/core"

export var parent = document.getElementById('hmd-test-parent')

export class DummyEditor {
  public el: HTMLDivElement;
  public cm: cm_t

  constructor(editorCfg?: CodeMirror.EditorConfiguration) {
    var el = this.el = document.createElement('div')
    var cm = this.cm = CodeMirror(el, { ...suggestedEditorConfig, ...editorCfg })

    parent.appendChild(el)
  }

  destory() {
    parent.removeChild(this.el)
  }
}
