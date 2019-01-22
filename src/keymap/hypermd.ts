// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
//
// powerful keymap for HyperMD and Markdown modes
//

import * as CodeMirror from "codemirror"
import { suggestedEditorConfig } from "../core";
import newlineAndContinue from "./newline-and-continue";
import newline from "./newline";
import shiftTab from "./shift-tab";
import tab from "./tab";
import keyMap from "./keymap";

/**
  Some code in these files are from CodeMirror's source code.

  CodeMirror, copyright (c) by Marijn Haverbeke and others
  MIT license: http://codemirror.net/LICENSE

  @see codemirror\addon\edit\continuelist.js
 */

Object.assign(CodeMirror.commands, {
  hmdNewlineAndContinue: newlineAndContinue,
  hmdNewline: newline,
  hmdShiftTab: shiftTab,
  hmdTab: tab,
})

CodeMirror.keyMap["hypermd"] = keyMap
suggestedEditorConfig.keyMap = "hypermd"
