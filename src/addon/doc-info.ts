// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
//
// DESCRIPTION: Generate AST-like Markdown Structure Info
//
// With this addon, it's easy to find headers / footnotes etc.
//

import * as CodeMirror from 'codemirror'
import * as Addon from '../core/addon'

import { cm_t } from '../core/type'
import { debounce, isEqual } from '../core/utils';
import { TokenSeeker } from '../core/TokenSeeker';
import '../core/polyfill';

//--------------------------------------------------------------------------
//#region NodeInfo

export interface BaseItem {
  lineNo: number

  /** text content without block token (eg. "#" or " - [x] ") */
  text: string
}

export interface Header extends BaseItem {
  level: number
}

export interface TodoItem extends BaseItem {
  checked: boolean
}

export interface Footnote extends BaseItem {
  name: string
}

export interface MathBlock extends BaseItem {
  endLineNo: number
}

export interface DocInfoLike {
  headers: Header[]
  todos: TodoItem[]
  footnotes: Footnote[]
  mathBlocks: MathBlock[]
}

//#endregion

/********************************************************************************** */
//#region CodeMirror Extension
// add methods to all CodeMirror editors

// every codemirror editor will have these member methods:
export const Extensions = {
  hmdGetDocInfo(this: cm_t) {
    return getAddon(this)
  }
}

export type ExtensionsType = typeof Extensions
declare global { namespace HyperMD { interface Editor extends ExtensionsType { } } }

for (var name in Extensions) {
  CodeMirror.defineExtension(name, Extensions[name])
}

//#endregion

/********************************************************************************** */
//#region Addon Class

const isFootnoteBegin: TokenSeeker.ConditionFunction = (token) => token.string === '[' && /\bhmd-footnote\b/.test(token.type)
const isMathBlockEnd: TokenSeeker.ConditionFunction = (token) => /\bmath-end\b/.test(token.type)

export class DocInfo implements Addon.Addon, DocInfoLike {
  headers: Header[] = []
  todos: TodoItem[] = []
  footnotes: Footnote[] = []
  mathBlocks: MathBlock[] = []

  constructor(public cm: cm_t) {
    cm.on('changes', this.reanalyze)
    this.reanalyze.immediate(true)
  }

  reanalyze = debounce((supressEvent?: boolean) => {
    var out: DocInfoLike = {
      footnotes: [],
      headers: [],
      mathBlocks: [],
      todos: [],
    }

    var mat: RegExpMatchArray
    const tokenSeeker = new TokenSeeker(this.cm)

    var skipLineCount = 0

    this.cm.eachLine(line => {
      if (skipLineCount) { skipLineCount--; return }

      const lineNo = line.lineNo(), lineText = line.text
      const tokens = this.cm.getLineTokens(lineNo)

      var isHeader: Header = null
      var isFootnote: Footnote = null
      var isTodoItem: TodoItem = null
      var isMathBlock: MathBlock = null

      // check every token in line

      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i]
        const type = token.type
        if (!type) continue

        if (!isHeader) {
          if (mat = type.match(/line-HyperMD-header-(\d)/)) {
            let level = ~~mat[1], text = lineText
            // strip leading/ tailing #s
            if (mat = text.match(/^#+(?=\s)/)) text = text.slice(mat[0].length).replace(/\s+#+$/, '').trim()
            out.headers.push(isHeader = { lineNo, text, level })
          }
        }

        if (!isFootnote) {
          if (token.string === ']:' && type.match(/line-HyperMD-footnote/)) {
            tokenSeeker.setPos(lineNo, 0)
            let r = tokenSeeker.findPrev(isFootnoteBegin, i - 1)
            let name = lineText.slice(r.token.end, token.start)
            let text = lineText.slice(token.end)
            out.footnotes.push(isFootnote = { lineNo, text, name })
          }
        }

        if (!isTodoItem) {
          if (type.match(/formatting-task/)) {
            let checked = /\bproperty\b/.test(token.type)
            let text = lineText.slice(token.end)
            out.todos.push(isTodoItem = { lineNo, text, checked })
          }
        }

        if (!isMathBlock) {
          if (i == 0 && type.match(/math-begin\s+math-2/)) {
            tokenSeeker.setPos(line, token.end)
            const r = tokenSeeker.findNext(isMathBlockEnd, true)
            if (r && r.token.end >= this.cm.getLine(r.lineNo).length) {
              // yes, this is valid math block!
              let endLineNo = r.lineNo
              let text = this.cm.getRange(
                { line: lineNo, ch: token.end },
                { line: endLineNo, ch: r.token.start }
              )
              skipLineCount += endLineNo - lineNo
              out.mathBlocks.push(isMathBlock = { lineNo, endLineNo, text })
            }
          }
        }
      }
    })

    if (supressEvent) Object.assign(this, out)
    else this._diffAndApply(out)
  }, 50)

  private _diffAndApply(data: DocInfoLike) {
    for (let k in data) {
      if (!isEqual(data[k], this[k])) {
        CodeMirror.signal(this.cm, "docInfoChange", k, data[k])
        this[k] = data[k]
      }
    }
  }
}

//#endregion

/** ADDON GETTER (Singleton Pattern): a editor can have only one DocInfo instance */
export const getAddon = Addon.Getter("DocInfo", DocInfo /** n options */)
declare global { namespace HyperMD { interface HelperCollection { DocInfo?: DocInfo } } }
