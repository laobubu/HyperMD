// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
//
// powerful keymap for HyperMD and Markdown modes
//

import CodeMirror from 'codemirror'
import 'codemirror/addon/edit/continuelist'

var keyMap: CodeMirror.KeyMap = {
  "Shift-Tab": "indentLess",
  "Enter": "newlineAndIndentContinueMarkdownList",
}

CodeMirror.normalizeKeyMap(keyMap)
CodeMirror.keyMap["hypermd"] = keyMap

export { keyMap }
