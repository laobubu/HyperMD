import { DummyEditor } from 'hypermd_test/dummy-editor';
import { EditorConfiguration } from 'codemirror';

export var editor: DummyEditor
export var cm: DummyEditor['cm']

export function init(cfg?: EditorConfiguration){
  editor = new DummyEditor(cfg)
  window['cm'] = cm = editor.cm
}

export function destory() {
  editor.destory()
  cm = null
  editor = null
}

/**
 * get element from editor HTML element
 */
export function querySelector(selector: string, not_throw_error?: boolean): HTMLElement {
  var ans = editor.el.querySelector(selector) as HTMLElement
  if (!ans && !not_throw_error) throw new Error(`Cant locate Rendered Element for ${selector}`)
  return ans
}
