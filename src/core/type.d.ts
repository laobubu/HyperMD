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

export interface cm_t extends CodeMirror.Editor, HyperMD.Editor {
  // blank
}

declare module "codemirror" {
  /// SOME LEGACY METHODS

  var modes: { [mode: string]: CodeMirror.Mode<any> }

  /**
   * Compare two positions, return 0 if they are the same,
   * a negative number when a is less, and a positive number otherwise.
   */
  function cmpPos(a: Position, b: Position): number;


  /// MODE AND MIME

  function defineMIME(mime: string, mode: string);
  function defineMode<T>(id: string, modefactory: ModeFactory<T>, alias: string | string[]): void;

  // codemirror/mode/meta
  interface ModeMeta {
    name: string
    mime: string
    mode: string
    ext?: string[]
  }
  function findModeByName(lang: string): ModeMeta

  interface EditorConfiguration extends HyperMD.EditorConfiguration {

  }

  interface StringStream {
    lineOracle: any

    lookAhead(lineCount: number): string
  }

  interface Editor extends Doc {
    display: any
    options: any

    getAllMarks(): TextMarker[]

    /**
     * This is a (much) cheaper version of getTokenAt useful for when you just need the type of the token at a given position,
     * and no other information.
     *
     * Will return null for unstyled tokens, and a string, potentially containing multiple space-separated style names, otherwise.
     */
    getTokenTypeAt(pos: Position): string
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
  }

  interface LineHandle {
    styles?: (string | number)[]
    parent: any

    lineNo(): number

    markedSpans?: { from: number | null, to: number | null, marker: TextMarker }[]
  }

  /** CodeMirror internal Object */
  interface LineView {
    line: LineHandle
    lineN: number
    rest: LineHandle[]
    hidden?: boolean
    text: HTMLPreElement
    measure?: {
      cache?: object
      map?: (number | Text | HTMLSpanElement)[]   // HTMLSpanElement is for folded stuff like <span class="CodeMirror-widget" role="presentation" cm-ignore-events="true">

      caches?: object[]
      maps?: (number | Text | HTMLSpanElement)[][]
    }
  }
}
