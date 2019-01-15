// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
//
// DESCRIPTION: Click to open links / jump to footnotes / toggle TODOs, and more.
//
// With custom ClickHandler supported
//

import * as CodeMirror from 'codemirror'
import { Addon, FlipFlop, expandRange, suggestedEditorConfig } from '../core'

import { cm_t } from '../core/type'
import { splitLink } from './read-link'
import { HyperMDState } from '../mode/hypermd';

/********************************************************************************** */
//#region CLICK HANDLER

export type TargetType = "image" | "link" | "footref" | "url" | "todo" | "hashtag"
export interface ClickInfo {
  type: TargetType
  text: string
  url: string // for todo item, url is empty
  pos: CodeMirror.Position

  button: number
  clientX: number
  clientY: number

  ctrlKey: boolean
  altKey: boolean
  shiftKey: boolean
}

/**
 * User may define his click handler, which has higher priority than HyperMD's.
 *
 * param `info` is a ClickInfo object, containing target type, text etc.
 *
 * Custom handler may return `false` to prevent HyperMD's default behavior.
 */
export type ClickHandler = (info: ClickInfo, cm: cm_t) => (false | void)
//#endregion

/********************************************************************************** */
//#region defaultClickHandler

export const defaultClickHandler: ClickHandler = (info, cm) => {
  var { text, type, url, pos } = info

  if (type === 'url' || type === 'link') {
    var footnoteRef = text.match(/\[[^\[\]]+\](?:\[\])?$/) // bare link, footref or [foot][] . assume no escaping char inside
    if (footnoteRef && info.altKey) {
      // extract footnote part (with square brackets), then jump to the footnote
      text = footnoteRef[0]
      if (text.slice(-2) === '[]') text = text.slice(0, -2) // remove [] of [foot][]
      type = "footref"
    } else if ((info.ctrlKey || info.altKey) && url) {
      // just open URL
      window.open(url, "_blank")
    }
  }

  if (type === 'todo') {
    let { from, to } = expandRange(cm, pos, "formatting-task")
    let text = cm.getRange(from, to)
    text = (text === '[ ]') ? '[x]' : '[ ]'
    cm.replaceRange(text, from, to)
  }

  if (type === 'footref' && (info.ctrlKey || info.altKey)) {
    // Jump to FootNote
    const footnote_name = text.slice(1, -1)
    const footnote = cm.hmdReadLink(footnote_name, pos.line)
    if (footnote) {
      makeBackButton(cm, footnote.line, pos)
      cm.setCursor({ line: footnote.line, ch: 0 })
    }
  }
}

/**
 * Display a "go back" button. Requires "HyperMD-goback" gutter set.
 *
 * maybe not useful?
 *
 * @param line where to place the button
 * @param anchor when user click the back button, jumps to here
 */
const makeBackButton = (function () {
  var bookmark: { find(): CodeMirror.Position; clear() } = null

  function updateBookmark(cm: cm_t, pos: CodeMirror.Position) {
    if (bookmark) {
      cm.clearGutter("HyperMD-goback")
      bookmark.clear()
    }
    bookmark = cm.setBookmark(pos) as any
  }

  /**
   * Make a button, bind event handlers, but not insert the button
   */
  function makeButton(cm: cm_t) {
    var hasBackButton = cm.options.gutters.indexOf("HyperMD-goback") != -1
    if (!hasBackButton) return null

    var backButton = document.createElement("div")
    backButton.className = "HyperMD-goback-button"
    backButton.addEventListener("click", function () {
      cm.setCursor(bookmark.find())
      cm.clearGutter("HyperMD-goback")
      bookmark.clear()
      bookmark = null
    })

    var _tmp1 = cm.display.gutters.children
    _tmp1 = _tmp1[_tmp1.length - 1]
    _tmp1 = _tmp1.offsetLeft + _tmp1.offsetWidth
    backButton.style.width = _tmp1 + "px"
    backButton.style.marginLeft = -_tmp1 + "px"

    return backButton
  }

  return function (cm: cm_t, line: number, anchor: CodeMirror.Position) {
    var backButton = makeButton(cm)
    if (!backButton) return

    backButton.innerHTML = (anchor.line + 1) + ""
    updateBookmark(cm, anchor)
    cm.setGutterMarker(line, "HyperMD-goback", backButton)
  }
})();

//#endregion

/********************************************************************************** */
//#region Addon Options

export interface Options extends Addon.AddonOptions {
  /** Enable Click features or not. */
  enabled: boolean

  /**
   * A callback when user clicked on something. May return `false` to supress HyperMD default behavoir.
   * @see ClickHandler
   */
  handler: ClickHandler
}

export const defaultOption: Options = {
  enabled: false,
  handler: null,
}

export const suggestedOption: Partial<Options> = {
  enabled: true,  // we recommend lazy users to enable this fantastic addon!
}

export type OptionValueType = Partial<Options> | boolean | ClickHandler;

declare global {
  namespace HyperMD {
    interface EditorConfiguration {
      /**
       * Options for Click.
       *
       * You may also provide a `false` to disable it; a `true` to enable it with default behavior;
       * or a callback which may return `false` to supress HyperMD default behavoir.
       */
      hmdClick?: OptionValueType
    }
  }
}

suggestedEditorConfig.hmdClick = suggestedOption

CodeMirror.defineOption("hmdClick", defaultOption, function (cm: cm_t, newVal: OptionValueType) {

  ///// convert newVal's type to `Partial<Options>`, if it is not.

  if (!newVal || typeof newVal === "boolean") {
    newVal = { enabled: !!newVal }
  } else if (typeof newVal === "function") {
    newVal = { enabled: true, handler: newVal }
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

export class Click implements Addon.Addon, Options {
  enabled: boolean;
  handler: ClickHandler;

  private el: HTMLElement

  constructor(public cm: cm_t) {
    this.lineDiv = cm.display.lineDiv
    var el = this.el = cm.getWrapperElement()

    new FlipFlop(
      /* ON  */() => {
        this.lineDiv.addEventListener("mousedown", this._mouseDown, false)
        el.addEventListener("keydown", this._keyDown, false)
      },
      /* OFF */() => {
        this.lineDiv.removeEventListener("mousedown", this._mouseDown, false)
        el.removeEventListener("keydown", this._keyDown, false)
      }
    ).bind(this, "enabled", true)
  }

  /** CodeMirror's <pre>s container */
  private lineDiv: HTMLDivElement

  /** It's not  */
  private _KeyDetectorActive: boolean

  /** remove modifier className to editor DOM */
  private _mouseMove_keyDetect = (ev: KeyboardEvent) => {
    var el = this.el
    var className = el.className, newClassName = className

    const altClass = "HyperMD-with-alt"
    const ctrlClass = "HyperMD-with-ctrl"

    if (!ev.altKey && className.indexOf(altClass) >= 0) {
      newClassName = className.replace(altClass, "");
    }

    if (!ev.ctrlKey && className.indexOf(ctrlClass) >= 0) {
      newClassName = className.replace(ctrlClass, "");
    }

    if (!ev.altKey && !ev.ctrlKey) {
      this._KeyDetectorActive = false;
      el.removeEventListener('mousemove', this._mouseMove_keyDetect, false);
    }

    if (className != newClassName) el.className = newClassName.trim()
  }

  /** add modifier className to editor DOM */
  private _keyDown = (ev: KeyboardEvent) => {
    var kc = ev.keyCode || ev.which
    var className = ""
    if (kc == 17) className = "HyperMD-with-ctrl"
    if (kc == 18) className = "HyperMD-with-alt"

    var el = this.el
    if (className && el.className.indexOf(className) == -1) {
      el.className += " " + className;
    }

    if (!this._KeyDetectorActive) {
      this._KeyDetectorActive = true;
      this.el.addEventListener('mousemove', this._mouseMove_keyDetect, false);
    }
  }

  /** last click info */
  private _cinfo: ClickInfo

  /**
   * Unbind _mouseUp, then call ClickHandler if mouse not bounce
   */
  private _mouseUp = (ev: MouseEvent) => {
    const cinfo = this._cinfo
    this.lineDiv.removeEventListener("mouseup", this._mouseUp, false)
    if (Math.abs(ev.clientX - cinfo.clientX) > 5 || Math.abs(ev.clientY - cinfo.clientY) > 5) return

    if (typeof this.handler === 'function' && this.handler(cinfo, this.cm) === false) return
    defaultClickHandler(cinfo, this.cm)
  }

  /**
   * Try to construct ClickInfo and bind _mouseUp
   */
  private _mouseDown = (ev: MouseEvent) => {
    var {
      button, clientX, clientY,
      ctrlKey, altKey, shiftKey,
    } = ev
    var cm = this.cm

    if ((ev.target as HTMLElement).tagName === "PRE") return

    var pos = cm.coordsChar({ left: clientX, top: clientY }, "window")
    var range: ReturnType<typeof expandRange>
    var token = cm.getTokenAt(pos)

    var state = token.state as HyperMDState
    var styles = " " + token.type + " "

    var mat: RegExpMatchArray

    var type: TargetType = null
    var text: string, url: string

    if (mat = styles.match(/\s(image|link|url)\s/)) {
      // Could be a image, link, bare-link, footref, footnote, plain url, plain url w/o angle brackets
      type = mat[1] as TargetType

      const isBareLink = /\shmd-barelink\s/.test(styles)

      if (state.linkText) {
        // click on content of a link text.
        range = expandRange(cm, pos, (token) => token.state.linkText || /(?:\s|^)link(?:\s|$)/.test(token.type))
        type = "link"
      } else {
        range = expandRange(cm, pos, type)
      }

      if (/^(?:image|link)$/.test(type) && !isBareLink) {
        // CodeMirror breaks [text] and (url)
        // Let HyperMD mode handle it!
        let tmp_range = expandRange(cm, { line: pos.line, ch: range.to.ch + 1 }, "url")
        if (tmp_range) range.to = tmp_range.to
      }

      text = cm.getRange(range.from, range.to).trim()

      // now extract the URL. boring job

      let tmp: number

      if (
        text.slice(-1) === ')' &&
        (tmp = text.lastIndexOf('](')) !== -1     // xxxx](url)     image / link without ref
      ) {
        // remove title part (if exists)
        url = splitLink(text.slice(tmp + 2, -1)).url
      } else if (
        (mat = text.match(/[^\\]\]\s?\[([^\]]+)\]$/)) ||  // .][ref]     image / link with ref
        (mat = text.match(/^\[(.+)\]\s?\[\]$/)) ||  // [ref][]
        (mat = text.match(/^\[(.+)\](?:\:\s*)?$/))        // [barelink] or [^ref] or [footnote]:
      ) {
        if (isBareLink && mat[1].charAt(0) === '^') type = 'footref'

        let t2 = cm.hmdReadLink(mat[1], pos.line)
        if (!t2) url = null
        else {
          // remove title part (if exists)
          url = splitLink(t2.content).url
        }

      } else if (
        (mat = text.match(/^\<(.+)\>$/)) ||    // <http://laobubu.net>
        (mat = text.match(/^\((.+)\)$/)) ||    // (http://laobubu.net)
        (mat = [null, text])                   // http://laobubu.net    last possibility: plain url w/o < >
      ) {
        url = mat[1]
      }

      url = cm.hmdResolveURL(url)

    } else if (styles.match(/\sformatting-task\s/)) {
      // TO-DO checkbox
      type = "todo"
      range = expandRange(cm, pos, "formatting-task")
      range.to.ch = cm.getLine(pos.line).length
      text = cm.getRange(range.from, range.to)
      url = null
    } else if (styles.match(/\shashtag/)) {
      type = "hashtag"
      range = expandRange(cm, pos, "hashtag")
      text = cm.getRange(range.from, range.to)
      url = null
    }

    if (type !== null) {
      this._cinfo = {
        type, text, url, pos,
        button, clientX, clientY,
        ctrlKey, altKey, shiftKey,
      }
      this.lineDiv.addEventListener('mouseup', this._mouseUp, false)
    }
  }
}

//#endregion

/** ADDON GETTER (Singleton Pattern): a editor can have only one Click instance */
export const getAddon = Addon.Getter("Click", Click, defaultOption /** if has options */)
declare global { namespace HyperMD { interface HelperCollection { Click?: Click } } }
