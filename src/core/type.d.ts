declare global {
  namespace HyperMD {
    interface HelperCollection extends Object {
      // Editor.hmd Object
    }

    interface EditorConfiguration {
      hmdCursorDebounce?: boolean
      hmdAutoFold?: number
      hmdFoldMath?: {
        interval?: number
        preview?: boolean | HTMLElement
      }

      hmdHideToken?: string
      hmdTableAlign: {
        lineColor?: string
        rowsepColor?: string
      }

      // addon may declare more configrable items
    }

    interface Editor {
      hmd: HelperCollection;    // containing some HyperMD addon/helper instances

      // addon may declare more methods and properties (aka. helpers in CodeMirror)

      //TODO: remove these methods:
      hmdClickInit(): void
    }
  }
}

export interface cm_t extends CodeMirror.Editor, HyperMD.Editor {
  // blank
}

declare module "codemirror" {
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
  var modes: { [mode: string]: CodeMirror.Mode<any> }

  interface EditorConfiguration extends HyperMD.EditorConfiguration {

  }

  interface StringStream {
    lineOracle: any

    lookAhead(lineCount: number): string
  }

  interface Editor extends Doc {
    display: any

    getAllMarks(): TextMarker[]
  }

  interface TextMarker {
    changed(): void
    className: string
  }

  interface LineHandle {
    styles?: (string | number)[]
    parent: any

    lineNo(): number
  }
}
