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

// if (HyperMD_Mark in editor), the editor was a HyperMD mode at least once
const HyperMD_Mark = '__hypermd__'

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
 * Editor Options that disable HyperMD WYSIWYG visual effects.
 * These option will be applied when user invoke `switchToNormal`.
 *
 * Addons about visual effects, shall update this object!
 */
export var normalVisualConfig: CodeMirror.EditorConfiguration = {
  theme: "default",
  /* eg. hmdFold: false, */
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
  var final_config = { ...suggestedEditorConfig, ...config }

  var cm = CodeMirror.fromTextArea(textArea, final_config)
  cm[HyperMD_Mark] = true

  return cm
}

/**
 * Turn HyperMD editor into to a normal editor
 *
 * Disable HyperMD visual effects.
 * Interactive addons like click or paste are not affected.
 *
 * If this CodeMirror editor is not in HyperMD mode, `switchToNormal` will do nothing.
 *
 * @param {cm_t} editor Any CodeMirror Editor! Created by HyperMD.fromTextArea, or `switchToHyperMD`-ed
 */
export function switchToNormal(editor: cm_t);
export function switchToNormal(editor: cm_t, theme: string);
export function switchToNormal(editor: cm_t, options: CodeMirror.EditorConfiguration);
export function switchToNormal(editor: cm_t, options_or_theme?: CodeMirror.EditorConfiguration | string) {
  // this CodeMirror editor has never been in HyperMD mode. `switchToNormal` is meanless
  if (!editor[HyperMD_Mark]) return;

  if (typeof options_or_theme === 'string') options_or_theme = { theme: options_or_theme };
  var opt = { ...normalVisualConfig, ...options_or_theme }

  for (const key in opt) {
    editor.setOption(key, opt[key])
  }
}

/**
 * Apply HyperMD suggestedEditorConfig to a CodeMirror Editor
 *
 * @param {cm_t} editor Any CodeMirror Editor! Created by HyperMD or CodeMirror
 */
export function switchToHyperMD(editor: cm_t);
export function switchToHyperMD(editor: cm_t, theme: string);
export function switchToHyperMD(editor: cm_t, options: CodeMirror.EditorConfiguration);
export function switchToHyperMD(editor: cm_t, options_or_theme?: CodeMirror.EditorConfiguration | string) {
  if (typeof options_or_theme === 'string') options_or_theme = { theme: options_or_theme };
  var opt: CodeMirror.EditorConfiguration = {};
  if (HyperMD_Mark in editor) {
    // has been HyperMD mode once. Only modify visual-related options
    for (const key in normalVisualConfig) {
      opt[key] = suggestedEditorConfig[key]
    }
    Object.assign(opt, options_or_theme)
  } else {
    // this CodeMirror editor is new to HyperMD
    Object.assign(opt, suggestedEditorConfig, options_or_theme)
    editor[HyperMD_Mark] = true
  }

  for (const key in opt) {
    editor.setOption(key, opt[key])
  }
}

