// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
//
// DESCRIPTION: Insert images or files into Editor by pasting (Ctrl+V) or Drag'n'Drop
//

import * as CodeMirror from 'codemirror'
import { Addon, FlipFlop, suggestedEditorConfig } from '../core'
import { cm_t } from '../core/type'


/********************************************************************************** */
//#region Exported Types and Utils

export interface HandlerAction {
  setPlaceholder(placeholder: HTMLElement)

  /**
   * update Editor display and adapt to the placeholder's size
   *
   * Call this when placeholder is resized.
   */
  resize()

  /**
   * remove placeholder and replace it with given text,
   * then move cursor to the front of `cursor`-th char (if `cursor` given).
   *
   * Call this when FileHandler's job is done (no matter success or fail)
   */
  finish(text: string, cursor?: number)

  marker: CodeMirror.TextMarker
  cm: cm_t
}

/**
 * File Handler is called when user is trying to insert file(s)
 *
 * returns `true` if files are accepted and uploading, and HyperMD will put a placeholder there.
 * Then FileHandler may use `action` object to change the placeholder and finish uploading.
 *
 * @see FileHandler
 * @see HandlerAction
 */
export type FileHandler = (files: FileList, action: HandlerAction) => boolean

/**
 * send data to url
 *
 * @param method default: "POST"
 */
export function ajaxUpload(
  url: string,
  form: { [name: string]: string | File; },
  callback: (content, error) => void,
  method?: string
) {
  var xhr = new XMLHttpRequest()
  var formData = new FormData()
  for (var name in form) formData.append(name, form[name])

  xhr.onreadystatechange = function () {
    if (4 == this.readyState) {
      var ret = xhr.responseText
      try { ret = JSON.parse(xhr.responseText) } catch (err) { }

      if (/^20\d/.test(xhr.status + "")) {
        callback(ret, null)
      } else {
        callback(null, ret)
      }
    }
  }

  xhr.open(method || 'POST', url, true)
  // xhr.setRequestHeader("Content-Type", "multipart/form-data");
  xhr.send(formData)
}

//#endregion

/********************************************************************************** */
//#region Default FileHandler

/** a spinning gif image (16x16) */
const spinGIF = ''
const errorPNG = ''

/**
 * Default FileHandler
 *
 * accepts images, uploads to https://sm.ms and inserts as `![](image_url)`
 */
export const DefaultFileHandler: FileHandler = function (files, action) {
  var unfinishedCount = 0

  var placeholderForAll = document.createElement("div")
  placeholderForAll.className = "HyperMD-insertFile-dfh-placeholder"
  action.setPlaceholder(placeholderForAll)

  /** @type {{name:string, url:string, placeholder:HTMLImageElement, blobURL:string}[]} */
  var uploads = []

  const supportBlobURL = typeof URL !== 'undefined'
  var blobURLs = []

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    if (!/image\//.test(file.type)) continue

    const blobURL = supportBlobURL ? URL.createObjectURL(file) : spinGIF
    const name = file.name.match(/[^\\\/]+\.\w+$/)[0]
    const url = null
    const placeholder = document.createElement("img")

    placeholder.onload = action.resize // img size changed
    placeholder.className = "HyperMD-insertFile-dfh-uploading"
    placeholder.src = blobURL
    placeholderForAll.appendChild(placeholder)

    uploads.push({
      blobURL, name, url, placeholder,
    })
    unfinishedCount++

    // now start upload image. once uploaded, `finishImage(index, url)` shall be called
    Upload_SmMs(file, uploads.length - 1)
  }

  return unfinishedCount > 0

  function finishImage(index, url) {
    uploads[index].url = url

    const placeholder = uploads[index].placeholder
    placeholder.className = "HyperMD-insertFile-dfh-uploaded"
    placeholder.src = url || errorPNG

    if (supportBlobURL) URL.revokeObjectURL(uploads[index].blobURL)

    if (--unfinishedCount === 0) {
      let texts = uploads.map(it => `![${it.name}](${it.url})`)
      action.finish(texts.join(" ") + " ")
    }
  }

  function Upload_SmMs(file, index) {
    ajaxUpload(
      'https://sm.ms/api/upload',
      {
        smfile: file,
        format: 'json'
      },
      function (o, e) {
        const imgURL = (o && o.code == 'success') ? o.data.url : null
        finishImage(index, imgURL)
      }
    )
  }
}

//#endregion


/********************************************************************************** */
//#region Addon Options

export interface Options extends Addon.AddonOptions {
  /** enable uploading from clipboard */
  byPaste: boolean

  /** enable drag n drop uploading */
  byDrop: boolean

  /**
   * handler function.
   *
   * returns `true` means files are accepted and uploading, and HyperMD will put a placeholder there.
   * Then FileHandler may use `action` object to change the placeholder and finish uploading.
   *
   * @see FileHandler
   * @see HandlerAction
   */
  fileHandler: FileHandler
}

export const defaultOption: Options = {
  byDrop: false,
  byPaste: false,
  fileHandler: DefaultFileHandler,
}

export const suggestedOption: Partial<Options> = {
  byPaste: true,  // we recommend lazy users to enable this fantastic addon!
  byDrop: true,
}

export type OptionValueType = Partial<Options> | boolean | FileHandler;

declare global {
  namespace HyperMD {
    interface EditorConfiguration {
      /**
       * Options for InsertFile.
       *
       * You may also provide a `false` to disable it; a `true` to enable it with DefaultFileHandler
       *
       * Or provide a FileHandler(overwrite the default one), meanwhile, byDrop & byPaste will set to `true`
       *
       * @see FileHandler
       * @see HandlerAction
       */
      hmdInsertFile?: OptionValueType
    }
  }
}

suggestedEditorConfig.hmdInsertFile = suggestedOption

CodeMirror.defineOption("hmdInsertFile", defaultOption, function (cm: cm_t, newVal: OptionValueType) {

  ///// convert newVal's type to `Partial<Options>`, if it is not.

  if (!newVal || typeof newVal === "boolean") {
    let enabled = !!newVal
    newVal = { byDrop: enabled, byPaste: enabled }
  } else if (typeof newVal === 'function') {
    newVal = { byDrop: true, byPaste: true, fileHandler: newVal }
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

export class InsertFile implements Addon.Addon, Options /* if needed */ {
  byPaste: boolean;
  byDrop: boolean;
  fileHandler: FileHandler;

  constructor(public cm: cm_t) {
    // options will be initialized to defaultOption when constructor is finished

    new FlipFlop(
      /* ON  */() => this.cm.on("paste", this.pasteHandle),
      /* OFF */() => this.cm.off("paste", this.pasteHandle)
    ).bind(this, "byPaste", true)

    new FlipFlop(
      /* ON  */() => this.cm.on("drop", this.pasteHandle),
      /* OFF */() => this.cm.off("drop", this.pasteHandle)
    ).bind(this, "byDrop", true)
  }

  /**
   * upload files to the current cursor.
   *
   * @param {DataTransfer} data
   * @returns {boolean} data is accepted or not
   */
  doInsert(data: DataTransfer): boolean {
    const cm = this.cm

    if (!data || !data.files || 0 === data.files.length) return false
    const files = data.files

    var fileHandler = this.fileHandler || DefaultFileHandler
    var handled = false

    cm.operation(() => {
      // create a placeholder
      cm.replaceSelection(".")
      var posTo = cm.getCursor()
      var posFrom = { line: posTo.line, ch: posTo.ch - 1 }

      var placeholderContainer = document.createElement("span")
      var marker = cm.markText(posFrom, posTo, {
        replacedWith: placeholderContainer,
        clearOnEnter: false,
        handleMouseEvents: false,
      })

      var action: HandlerAction = {
        marker, cm,

        finish: (text, cursor) => cm.operation(() => {
          var range = marker.find()
          var posFrom = range.from, posTo = range.to
          cm.replaceRange(text, posFrom, posTo)
          marker.clear()

          if (typeof cursor === 'number') cm.setCursor({
            line: posFrom.line,
            ch: posFrom.ch + cursor,
          })
        }),

        setPlaceholder: (el) => {
          if (placeholderContainer.childNodes.length > 0)
            placeholderContainer.removeChild(placeholderContainer.firstChild)
          placeholderContainer.appendChild(el)

          marker.changed()
        },

        resize() {
          marker.changed()
        }
      }

      handled = fileHandler(files, action)

      if (!handled) marker.clear()
    })

    return handled
  }

  private pasteHandle = (cm: cm_t, ev: ClipboardEvent) => {
    if (!this.doInsert(ev.clipboardData || window['clipboardData'])) return
    ev.preventDefault()
  }

  private dropHandle = (cm: cm_t, ev: DragEvent) => {
    var self = this, cm = this.cm, result = false
    cm.operation(function () {
      var pos = cm.coordsChar({ left: ev.clientX, top: ev.clientY }, "window")
      cm.setCursor(pos)
      result = self.doInsert(ev.dataTransfer)
    })
    if (!result) return
    ev.preventDefault()
  }
}

//#endregion

/** ADDON GETTER (Singleton Pattern): a editor can have only one InsertFile instance */
export const getAddon = Addon.Getter("InsertFile", InsertFile, defaultOption /** if has options */)
declare global { namespace HyperMD { interface HelperCollection { InsertFile?: InsertFile } } }
