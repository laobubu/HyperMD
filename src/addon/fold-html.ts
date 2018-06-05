// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
//
// DESCRIPTION: Fold and render embedded HTML snippets
//

import * as CodeMirror from 'codemirror'
import { Position } from 'codemirror'
import { Addon, FlipFlop, suggestedEditorConfig, debounce } from '../core'
import { cm_t } from '../core/type'
import { builtinFolder, breakMark, FolderFunc, RequestRangeResult } from './fold'

/**
 * Before folding HTML, check its security and avoid XSS attack! Returns true if safe.
 */
export type CheckerFunc = (html: string, pos: Position, cm: cm_t) => boolean

export var defaultChecker: CheckerFunc = (html) => {
  // TODO: read https://www.owasp.org/index.php/XSS_Filter_Evasion_Cheat_Sheet

  if (/<(?:script|style|link|meta)/i.test(html)) return false // don't allow some tags
  if (/\son\w+\s*=/i.test(html)) return false // don't allow `onclick=` etc.
  if (/src\s*=\s*["']?javascript:/i.test(html)) return false // don't allow `src="javascript:` etc.
  return true
}

/********************************************************************************** */
//#region Folder
/**
 * Detect if a token is a beginning of HTML, and fold it!
 *
 * @see FolderFunc in ./fold.ts
 */
export const HTMLFolder: FolderFunc = (stream, token) => {
  if (!token.type || !/ hmd-html-begin/.test(token.type)) return null
  const endInfo = stream.findNext(/ hmd-html-end/, true)
  if (!endInfo || / hmd-html-unclosed/.test(endInfo.token.type)) return null

  const cm = stream.cm
  const from: Position = { line: stream.lineNo, ch: token.start }
  const to: Position = { line: endInfo.lineNo, ch: endInfo.token.end }

  var addon = getAddon(cm)
  var html: string = cm.getRange(from, to)

  if (!addon.checker(html, from, cm)) return null // security check

  // security check pass!

  const reqAns = stream.requestRange(from, to)
  if (reqAns !== RequestRangeResult.OK) return null

  // now we are ready to fold and render!

  var stub = makeStub(addon.stubText)
  var el = renderHTML(html)

  stub.addEventListener("click", () => breakMark(cm, marker), false);

  var span = document.createElement("span")
  span.setAttribute("class", "hmd-fold-html")
  span.setAttribute("style", "display: inline-block")
  span.appendChild(el)
  span.appendChild(stub)

  var marker = cm.markText(from, to, {
    clearOnEnter: true,
    replacedWith: span,
  })

  /** If element size changed, we notify CodeMirror */
  watchSize(el, debounce(() => marker.changed(), 100))

  return marker
}

function watchSize(el: HTMLElement, onChange: () => void) {
  var tagName = el.tagName
  if (/^(?:img|video)$/i.test(tagName)) { // size will change if loaded
    el.addEventListener('load', onChange, false)
    el.addEventListener('error', onChange, false)
  }
  var children = el.children || []
  for (let i = 0; i < children.length; i++) {
    watchSize(children[i], onChange)
  }
}

function makeStub(text?: string) {
  var ans = document.createElement('span')
  ans.setAttribute("class", "hmd-fold-html-stub")
  ans.textContent = text || '<HTML>'

  return ans
}

function renderHTML(html: string): HTMLElement {
  var tagBegin = /^<(\w+)\s*/.exec(html)
  var tagName = tagBegin[1]
  var ans = document.createElement(tagName)

  var propRE = /([\w\:\-]+)(?:\s*=\s*((['"]).*?\3|\S+))?\s*/g
  var propLastIndex = propRE.lastIndex = tagBegin[0].length
  var tmp: RegExpExecArray
  while (tmp = propRE.exec(html)) {
    if (tmp.index > propLastIndex) break // emmm

    var propName = tmp[1]
    var propValue = tmp[2] // could be wrapped by " or '
    if (propValue && /^['"]/.test(propValue)) propValue = propValue.slice(1, -1)

    ans.setAttribute(propName, propValue)
    propLastIndex = propRE.lastIndex
  }

  tmp = new RegExp(`</${tagName}\\s*>$`, "i").exec(html)
  if (tmp) { // tag is closed
    var startCh = html.indexOf('>', propLastIndex) + 1
    var endCh = tmp.index
    var innerHTML = html.slice(startCh, endCh)
    if (innerHTML) ans.innerHTML = innerHTML
  }

  return ans
}
//#endregion

builtinFolder["html"] = HTMLFolder // inject fold's builtinFolders! Not cool but it works

/********************************************************************************** */
//#region Addon Options

export interface Options extends Addon.AddonOptions {
  /** Before folding HTML, check it to avoid XSS attack! Returns `true` if safe. */
  checker: CheckerFunc

  /** There MUST be a stub icon after rendered HTML. You may decide its content. */
  stubText: string
}

export const defaultOption: Options = {
  checker: defaultChecker,
  stubText: "<HTML>",
}

export const suggestedOption: Partial<Options> = {

}

export type OptionValueType = Partial<Options> | CheckerFunc;

declare global {
  namespace HyperMD {
    interface EditorConfiguration {
      /**
       * Options for HTMLFolder
       *
       * **NOTE**: to switch this feature off, please modify `hmdFold.html` instead.
       *
       * You may provide a CheckerFunc to check if a HTML is safe to render.
       */
      hmdFoldHTML?: OptionValueType
    }
  }
}

suggestedEditorConfig.hmdFoldHTML = suggestedOption

CodeMirror.defineOption("hmdFoldHTML", defaultOption, function (cm: cm_t, newVal: OptionValueType) {

  ///// convert newVal's type to `Partial<Options>`, if it is not.

  if (!newVal) { newVal = {} }
  else if (typeof newVal == 'function') { newVal = { checker: newVal } }
  else if (typeof newVal != 'object') {
    console.warn('[HyperMD][FoldHTML] incorrect option value type');
    newVal = {}
  }

  ///// apply config and write new values into cm

  var inst = getAddon(cm)
  for (var k in defaultOption) {
    inst[k] = (k in newVal) ? newVal[k] : defaultOption[k]
  }
})

//#endregion

/********************************************************************************** */
//#region Addon Class

export class FoldHTML implements Addon.Addon, Options {
  stubText: string;
  checker: CheckerFunc;

  constructor(public cm: cm_t) {
    // options will be initialized to defaultOption when constructor is finished
  }
}

//#endregion

/** ADDON GETTER (Singleton Pattern): a editor can have only one FoldHTML instance */
export const getAddon = Addon.Getter("FoldHTML", FoldHTML, defaultOption /** if has options */)
declare global { namespace HyperMD { interface HelperCollection { FoldHTML?: FoldHTML } } }
