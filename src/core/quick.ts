/**
 * Ready-to-use functions that powers up your Markdown editor
 *
 * @internal Part of HyperMD core.
 *
 * You shall NOT import this file; please import "core" instead
 */

import * as CodeMirror from "codemirror"
import { cm_t } from "./type"

import 'codemirror/addon/fold/foldcode'
import 'codemirror/addon/fold/foldgutter'
import 'codemirror/addon/fold/markdown-fold'
import 'codemirror/addon/edit/closebrackets'

import 'codemirror/lib/codemirror.css'
import 'codemirror/addon/fold/foldgutter.css'

import '../theme/hypermd-light.css'

/**
 * The default configuration that used by `HyperMD.fromTextArea`
 *
 * Addons may update this object freely!
 */
export var suggestedEditorConfig: CodeMirror.EditorConfiguration = {
  lineNumbers: true,
  lineWrapping: true,
  theme: "hypermd-light",
  mode: "text/x-hypermd",
  tabSize: 4, // CommonMark specifies tab as 4 spaces

  autoCloseBrackets: true,
  foldGutter: true,
  gutters: [
    "CodeMirror-linenumbers",
    "CodeMirror-foldgutter",
    "HyperMD-goback"  // (addon: click) 'back' button for footnotes
  ],
}

/**
 * Initialize an editor from a <textarea>
 * Calling `CodeMirror.fromTextArea` with recommended HyperMD options
 *
 * @see CodeMirror.fromTextArea
 *
 * @param {HTMLTextAreaElement} textArea
 * @param {object} [config]
 * @returns {cm_t}
 */
export function fromTextArea(textArea: HTMLTextAreaElement, config?: object): cm_t {
  var final_config = Object.assign({}, suggestedEditorConfig, config)

  var cm = CodeMirror.fromTextArea(textArea, final_config) as any as cm_t

  return cm
}

/**
 * Turn HyperMD editor into to a normal editor
 *
 * Disable HyperMD visual effects.
 * Interactive addons like click or paste are not affected.
 *
 * @param {cm_t} editor Created by **HyperMD.fromTextArea**
 * @param {string} [theme]
 */
export function switchToNormal(editor: cm_t, theme?: string) {
  editor.setOption('theme', theme || "default")
  editor.setOption('hmdFold', false)  // unfold all folded parts
  editor.setOption('hmdHideToken', false) // stop hiding tokens
  editor.setOption('hmdTableAlign', false)  // stop aligining table columns
}

/**
 * Revert what `HyperMD.switchToNormal` does
 *
 * @param {cm_t} editor Created by **HyperMD.fromTextArea**
 * @param {string} [theme]
 */
export function switchToHyperMD(editor: cm_t, theme: string) {
  editor.setOption('theme', theme || 'hypermd-light')
  editor.setOption('hmdFold', true)
  editor.setOption('hmdHideToken', true)
  editor.setOption('hmdTableAlign', true)
}

