// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
//
// DESCRIPTION: Fold and render embedded HTML snippets
//

import * as CodeMirror from 'codemirror'
import { Position } from 'codemirror'
import { Addon, suggestedEditorConfig, visitElements, watchSize } from '../core'
import { cm_t } from '../core/type'
import { registerFolder, breakMark, FolderFunc, RequestRangeResult } from './fold'
import './read-link'

/********************************************************************************** */
/**
 * Before folding HTML, check its security and avoid XSS attack! Returns true if safe.
 */
export type CheckerFunc = (html: string, pos: Position, cm: cm_t) => boolean

export var defaultChecker: CheckerFunc = (html) => {
  // TODO: read https://www.owasp.org/index.php/XSS_Filter_Evasion_Cheat_Sheet

  if (/^<(?:br)/i.test(html)) return false // check first element...
  if (/<(?:script|style|link|meta)/i.test(html)) return false // don't allow some tags
  if (/\son\w+\s*=/i.test(html)) return false // don't allow `onclick=` etc.
  if (/src\s*=\s*["']?javascript:/i.test(html)) return false // don't allow `src="javascript:` etc.
  return true
}

/********************************************************************************** */

/**
 * Something like `jQuery("<div>xxxx</div>")`, but serves for HyperMD's FoldHTML. You may returns `null` to stop folding.
 *
 * @param html only have one root element
 */
export type RendererFunc = (html: string, pos: Position, cm: cm_t) => HTMLElement

/**
 * Create HTMLElement from HTML string and do special process with HyperMD.ReadLink
 */
export var defaultRenderer: RendererFunc = (html: string, pos: Position, cm: cm_t): HTMLElement => {
  var tagBegin = /^<(\w+)\s*/.exec(html)
  if (!tagBegin) return null

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

  if ('innerHTML' in ans) {
    // node may contain innerHTML
    var startCh = html.indexOf('>', propLastIndex) + 1
    var endCh = html.length

    if (tmp = new RegExp(`</${tagName}\\s*>\\s*$`, "i").exec(html)) {
      endCh = tmp.index
    }

    var innerHTML = html.slice(startCh, endCh)
    if (innerHTML) ans.innerHTML = innerHTML

    // resolve relative URLs and change default behavoirs

    visitElements([ans], (el) => {
      const tagName = el.tagName.toLowerCase()

      if (tagName === 'a') {
        // for links, if target not set, add target="_blank"
        if (!el.getAttribute("target")) el.setAttribute("target", "_blank")
      }

      // Then, resovle relative URLs

      const urlAttrs: string[] = ({
        a: ["href"],
        img: ["src"],
        iframe: ["src"],
      })[tagName];

      if (urlAttrs) {
        for (let i = 0; i < urlAttrs.length; i++) {
          const attr = urlAttrs[i]
          const attrValue = el.getAttribute(attr)
          if (attrValue) el.setAttribute(attr, cm.hmdResolveURL(attrValue))
        }
      }
    })
  }

  return ans
}

/********************************************************************************** */

const stubClass = "hmd-fold-html-stub"
const stubClassOmittable = "hmd-fold-html-stub omittable"
const stubClassHighlight = "hmd-fold-html-stub highlight"

/********************************************************************************** */
//#region Folder
/**
 * Detect if a token is a beginning of HTML, and fold it!
 *
 * @see FolderFunc in ./fold.ts
 */
export const HTMLFolder: FolderFunc = (stream, token) => {
  if (!token.type || !/ hmd-html-begin/.test(token.type)) return null
  const endInfo = stream.findNext(/ hmd-html-\w+/, true) // find next html start/end token
  if (!endInfo || !/ hmd-html-end/.test(endInfo.token.type) || / hmd-html-unclosed/.test(endInfo.token.type)) return null

  const cm = stream.cm
  const from: Position = { line: stream.lineNo, ch: token.start }
  const to: Position = { line: endInfo.lineNo, ch: endInfo.token.end }

  const inlineMode: boolean = from.ch != 0 || to.ch < cm.getLine(to.line).length
  // if (!inlineMode) {
  //   // if not inline mode, be greddy and eat following blank lines (except last line of editor)!
  //   let lastLine: number = cm.lastLine() - 1
  //   let allowCount: number = 1
  //   while (allowCount > 0 && to.line < lastLine) {
  //     let nextLine: string = cm.getLine(to.line + 1)
  //     if (!/^\s*$/.test(nextLine)) break
  //     to.line++
  //     to.ch = nextLine.length
  //     allowCount--
  //   }
  // }

  var addon = getAddon(cm)
  var html: string = cm.getRange(from, to)

  if (!addon.checker(html, from, cm)) return null // security check

  // security check pass!

  const reqAns = stream.requestRange(from, to)
  if (reqAns !== RequestRangeResult.OK) return null

  // now we are ready to fold and render!

  var marker = addon.renderAndInsert(html, from, to, inlineMode)
  return marker
}
//#endregion

registerFolder("html", HTMLFolder, false)

/********************************************************************************** */
//#region Addon Options

export interface Options extends Addon.AddonOptions {
  /** Before folding HTML, check it to avoid XSS attack! Returns `true` if safe. */
  checker: CheckerFunc

  /** A RendererFunc accepts HTML string (which has only one root node), renders it and returns the root element node */
  renderer: RendererFunc

  /** There MUST be a stub icon after rendered HTML. You may decide its content. */
  stubText: string

  /** If the rendered element's tagName matches this, user can NOT break it by clicking it */
  isolatedTagName: RegExp
}

export const defaultOption: Options = {
  checker: defaultChecker,
  renderer: defaultRenderer,
  stubText: "<HTML>",
  isolatedTagName: /^(?:div|pre|form|table|iframe|ul|ol|input|textarea|p|summary|a)$/i,
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

  ///// Type Check
  if (inst.isolatedTagName && !(inst.isolatedTagName instanceof RegExp)) {
    console.error("[HyperMD][FoldHTML] option isolatedTagName only accepts RegExp")
    inst.isolatedTagName = defaultOption.isolatedTagName
  }
})

//#endregion

/********************************************************************************** */
//#region Addon Class

export class FoldHTML implements Addon.Addon, Options {
  renderer: RendererFunc;
  isolatedTagName: RegExp;
  stubText: string;
  checker: CheckerFunc;

  constructor(public cm: cm_t) {
    // options will be initialized to defaultOption when constructor is finished
  }

  /**
   * Render HTML, insert into editor and return the marker
   */
  renderAndInsert(html: string, from: CodeMirror.Position, to: CodeMirror.Position, inlineMode?: boolean): CodeMirror.TextMarker {
    const cm = this.cm

    var stub = this.makeStub()
    var el = this.renderer(html, from, cm)
    var breakFn = () => breakMark(cm, marker)

    if (!el) return null

    stub.addEventListener("click", breakFn, false)
    if (!el.tagName.match(this.isolatedTagName || /^$/)) el.addEventListener("click", breakFn, false)

    var replacedWith: HTMLElement
    var marker: CodeMirror.TextMarker

    if (inlineMode) {
      /** put HTML inline */
      let span = document.createElement("span")
      span.setAttribute("class", "hmd-fold-html")
      span.setAttribute("style", "display: inline-block")
      span.appendChild(stub)
      span.appendChild(el)

      replacedWith = span

      /** If element size changed, we notify CodeMirror */
      var watcher = watchSize(el, (w, h) => {
        const computedStyle = getComputedStyle(el)
        const getStyle = (name) => computedStyle.getPropertyValue(name)

        var floating =
          w < 10 || h < 10 ||
          !/^relative|static$/i.test(getStyle('position')) ||
          !/^none$/i.test(getStyle('float'))

        if (!floating) stub.className = stubClassOmittable
        else stub.className = stubClass

        marker.changed()
      })

      watcher.check() // trig the checker once

      // Marker is not created yet. Bind events later
      setTimeout(() => {
        marker.on("clear", () => {
          watcher.stop()
        })
      }, 0)
    } else {
      /** use lineWidget to insert element */
      replacedWith = stub

      let lineWidget = cm.addLineWidget(to.line, el, {
        above: false,
        coverGutter: false,
        noHScroll: false,
        showIfHidden: false,
      })

      let highlightON = () => stub.className = stubClassHighlight
      let highlightOFF = () => stub.className = stubClass

      el.addEventListener("mouseenter", highlightON, false)
      el.addEventListener("mouseleave", highlightOFF, false)

      var watcher = watchSize(el, () => lineWidget.changed())
      watcher.check()

      // Marker is not created yet. Bind events later
      setTimeout(() => {
        marker.on("clear", () => {
          watcher.stop()
          lineWidget.clear()
          el.removeEventListener("mouseenter", highlightON, false)
          el.removeEventListener("mouseleave", highlightOFF, false)
        })
      }, 0)
    }

    marker = cm.markText(from, to, {
      replacedWith,
    })

    return marker
  }

  makeStub() {
    var ans = document.createElement('span')
    ans.setAttribute("class", stubClass)
    ans.textContent = this.stubText || '<HTML>'

    return ans
  }
}

//#endregion

/** ADDON GETTER (Singleton Pattern): a editor can have only one FoldHTML instance */
export const getAddon = Addon.Getter("FoldHTML", FoldHTML, defaultOption /** if has options */)
declare global { namespace HyperMD { interface HelperCollection { FoldHTML?: FoldHTML } } }
