declare global {
  namespace HyperMD {
    interface HelperCollection extends Object {
      // Editor.hmd Object
      // @see AddonAlias in src/addon/skeleton.ts
      // @see getAddon in src/core/addon.ts
    }

    interface EditorConfiguration {
      // addon may declare option items in its own .ts file
      // @see OptionName in src/addon/skeleton.ts
    }

    interface Editor {
      hmd: HelperCollection;    // containing some HyperMD addon/helper instances

      // addon may declare more methods and properties (aka. "Extension" in CodeMirror)
      // @see ExtName in src/addon/skeleton.ts
    }
  }
}

export type cm_t = CodeMirror.Editor

declare module "codemirror" {

  /** initial value for options */
  const Init: any

  /// SOME LEGACY METHODS

  var modes: { [mode: string]: CodeMirror.Mode<any> }

  /**
   * Compare two positions, return 0 if they are the same,
   * a negative number when a is less, and a positive number otherwise.
   */
  function cmpPos(a: CodeMirror.Position, b: CodeMirror.Position): number;

  function addClass(el: HTMLElement, className: string)
  function rmClass(el: HTMLElement, className: string)
  function contains(parent: HTMLElement, child: Node): boolean

  /// MODE AND MIME

  function defineMIME(mime: string, mode: string);
  function defineMode<T>(id: string, modefactory: CodeMirror.ModeFactory<T>, alias: string | string[]): void;

  function startState<T>(mode: CodeMirror.Mode<T>): T;
  function copyState<T>(mode: CodeMirror.Mode<T>, state: T): T;

  interface Mode<T> {
    innerMode?<U>(state: T): { state: U, mode: CodeMirror.Mode<U> }
  }

  /// Key Binding

  /** Multi-stroke key bindings can be specified by
   * separating the key names by spaces in the property name,
   * for example Ctrl-X Ctrl-V.
   *
   * When a map contains multi-stoke bindings or keys with modifiers that
   * are not specified in the default order (Shift-Cmd-Ctrl-Alt) */
  type KeyMap = {
    [keyName: string]: Command | ((cm: CodeMirror.Editor) => void) | string
  }

  type BuiltinCommand =
    "selectAll" | //Select the whole content of the editor.
    "singleSelection" | //When multiple selections are present, this deselects all but the primary selection.
    "killLine" | //Emacs-style line killing. Deletes the part of the line after the cursor. If that consists only of whitespace, the newline at the end of the line is also deleted.
    "deleteLine" | //Deletes the whole line under the cursor, including newline at the end.
    "delLineLeft" | //Delete the part of the line before the cursor.
    "delWrappedLineLeft" | //Delete the part of the line from the left side of the visual line the cursor is on to the cursor.
    "delWrappedLineRight" | //Delete the part of the line from the cursor to the right side of the visual line the cursor is on.
    "undo" | //Undo the last change. Note that, because browsers still don't make it possible for scripts to react to or customize the context menu, selecting undo (or redo) from the context menu in a CodeMirror instance does not work.
    "redo" | //Redo the last undone change.
    "undoSelection" | //Undo the last change to the selection, or if there are no selection-only changes at the top of the history, undo the last change.
    "redoSelection" | //Redo the last change to the selection, or the last text change if no selection changes remain.
    "goDocStart" | //Move the cursor to the start of the document.
    "goDocEnd" | //Move the cursor to the end of the document.
    "goLineStart" | //Move the cursor to the start of the line.
    "goLineStartSmart" | //Move to the start of the text on the line, or if we are already there, to the actual start of the line (including whitespace).
    "goLineEnd" | //Move the cursor to the end of the line.
    "goLineRight" | //Move the cursor to the right side of the visual line it is on.
    "goLineLeft" | //Move the cursor to the left side of the visual line it is on. If this line is wrapped, that may not be the start of the line.
    "goLineLeftSmart" | //Move the cursor to the left side of the visual line it is on. If that takes it to the start of the line, behave like goLineStartSmart.
    "goLineUp" | //Move the cursor up one line.
    "goLineDown" | //Move down one line.
    "goPageUp" | //Move the cursor up one screen, and scroll up by the same distance.
    "goPageDown" | //Move the cursor down one screen, and scroll down by the same distance.
    "goCharLeft" | //Move the cursor one character left, going to the previous line when hitting the start of line.
    "goCharRight" | //Move the cursor one character right, going to the next line when hitting the end of line.
    "goColumnLeft" | //Move the cursor one character left, but don't cross line boundaries.
    "goColumnRight" | //Move the cursor one character right, don't cross line boundaries.
    "goWordLeft" | //Move the cursor to the start of the previous word.
    "goWordRight" | //Move the cursor to the end of the next word.
    "goGroupLeft" | //Move to the left of the group before the cursor. A group is a stretch of word characters, a stretch of punctuation characters, a newline, or a stretch of more than one whitespace character.
    "goGroupRight" | //Move to the right of the group after the cursor (see above).
    "delCharBefore" | //Delete the character before the cursor.
    "delCharAfter" | //Delete the character after the cursor.
    "delWordBefore" | //Delete up to the start of the word before the cursor.
    "delWordAfter" | //Delete up to the end of the word after the cursor.
    "delGroupBefore" | //Delete to the left of the group before the cursor.
    "delGroupAfter" | //Delete to the start of the group after the cursor.
    "indentAuto" | //Auto-indent the current line or selection.
    "indentMore" | //Indent the current line or selection by one indent unit.
    "indentLess" | //Dedent the current line or selection by one indent unit.
    "insertTab" | //Insert a tab character at the cursor.
    "insertSoftTab" | //Insert the amount of spaces that match the width a tab at the cursor position would have.
    "defaultTab" | //If something is selected, indent it by one indent unit. If nothing is selected, insert a tab character.
    "transposeChars" | //Swap the characters before and after the cursor.
    "newlineAndIndent" | //Insert a newline and auto-indent the new line.
    "toggleOverwrite" | //Flip the overwrite flag.
    "save" | //Not defined by the core library, only referred to in key maps. Intended to provide an easy way for user code to define a save command.
    "find" |
    "findNext" |
    "findPrev" |
    "replace" |
    "replaceAll" | //Not defined by the core library, but defined in the search addon (or custom client addons).
    "newlineAndIndentContinueMarkdownList" // 'codemirror/addon/edit/continuelist'
    ;

  type Command = keyof CommandFunctions
  var keyMap: { [keymapName: string]: KeyMap }
  var commands: CommandFunctions

  interface CommandFunctions extends Record<BuiltinCommand, (cm: cm_t) => any> {
    hmdNewline: (cm: cm_t) => any
    hmdNewlineAndContinue: (cm: cm_t) => any
    hmdShiftTab: (cm: cm_t) => any
    hmdTab: (cm: cm_t) => any
  }

  function normalizeKeyMap(keymap: KeyMap): object;

  // codemirror/mode/meta
  interface ModeMeta {
    name: string
    mime: string
    mode: string
    ext?: string[]
  }
  function findModeByName(lang: string): ModeMeta

  interface EditorConfiguration extends HyperMD.EditorConfiguration {
    autoCloseBrackets?: boolean
  }

  interface StringStream {
    lineOracle: any

    lookAhead(lineCount: number): string
  }

  interface LineWidget {
    on(event: "redraw", fn: Function): void
    off(event: "redraw", fn: Function): void
  }

  interface Editor extends CodeMirror.Doc, HyperMD.Editor {
    display: any
    options: any

    getAllMarks(): CodeMirror.TextMarker[]

    /**
     * This is a (much) cheaper version of getTokenAt useful for when you just need the type of the token at a given position,
     * and no other information.
     *
     * Will return null for unstyled tokens, and a string, potentially containing multiple space-separated style names, otherwise.
     */
    getTokenTypeAt(pos: CodeMirror.Position): string

    execCommand(cmd: Command): void

    listSelections(): { anchor: CodeMirror.Position; head: CodeMirror.Position; empty(): boolean }[];
    replaceSelections(replacements: string[], select?: "around" | "start"): void;

    startOperation(): void;
    endOperation(): void;
  }

  interface TextMarker {
    changed(): void
    className: string

    /**
     * Fired when the cursor enters the marked range.
     * From this event handler, the editor state may be inspected but not modified,
     * with the exception that the range on which the event fires may be cleared.
     */
    on(eventName: 'beforeCursorEnter', handler: (this: CodeMirror.Editor) => void): void;
    off(eventName: 'beforeCursorEnter', handler: (this: CodeMirror.Editor) => void): void;

    /**
     * Fired when the range is cleared, either through cursor movement in combination
     * with `clearOnEnter` or through a call to its clear() method.
     *
     * Will only be fired once per handle.
     *
     * Note that deleting the range through text editing does not fire this event,
     * because an undo action might bring the range back into existence.
     *
     * `from` and `to` give the part of the document that the range spanned when it was cleared.
     */
    on(eventName: 'clear', handler: (this: CodeMirror.Editor, from: CodeMirror.Position, to: CodeMirror.Position) => void): void;
    off(eventName: 'clear', handler: (this: CodeMirror.Editor, from: CodeMirror.Position, to: CodeMirror.Position) => void): void;

    on(eventName: 'hide' | 'unhide', handler: Function): void;
    off(eventName: 'hide' | 'unhide', handler: Function): void;
  }

  interface LineHandle {
    styles?: (string | number)[]
    parent: any

    lineNo(): number

    markedSpans?: { from: number | null, to: number | null, marker: CodeMirror.TextMarker }[]
  }

  /** CodeMirror internal Object */
  interface LineView {
    line: CodeMirror.LineHandle
    lineN: number
    rest: CodeMirror.LineHandle[]
    hidden?: boolean
    text: HTMLPreElement
    measure?: {
      heights?: number[]

      cache?: object
      map?: (number | Text | HTMLSpanElement)[]   // HTMLSpanElement is for folded stuff like <span class="CodeMirror-widget" role="presentation" cm-ignore-events="true">

      caches?: object[]
      maps?: (number | Text | HTMLSpanElement)[][]
    }
  }
}
