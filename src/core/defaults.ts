// This module stores default values and suggested configurations
// Addons / PowerPacks can modifiy their properties

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
 * If your addon does sth about displaying,
 * please add configuration options that can disable the visual effects.
 * (eg. `hmdFold: false` -- stop folding things)
 */
export var normalVisualConfig: CodeMirror.EditorConfiguration = {
  theme: "default",
  /* eg. hmdFold: false, */
}
