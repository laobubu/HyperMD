// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
//
// Insert images or files into Editor by pasting (Ctrl+V) or Drag'n'Drop
//

import CodeMirror from 'codemirror'
import { Addon, FlipFlop } from '../core'
import { cm_t } from '../core/type'

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
export type FileHandler = (files: FileList, action: HandlerAction) => boolean


/** a spinning gif image (16x16) */
const spinGIF = ''
const errorPNG = ''

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

interface InserFileOptions extends Addon.AddonOptions {
  byPaste: boolean
  byDrop: boolean
  fileHandler: FileHandler | FileHandler[]
}

const defaultOption: InserFileOptions = {
  byDrop: true,
  byPaste: true,
  fileHandler: DefaultFileHandler,
}

class InsertFile implements Addon.Addon, InserFileOptions {
  byPaste: boolean = defaultOption.byPaste
  byDrop: boolean = defaultOption.byDrop
  fileHandler: FileHandler | FileHandler[] = defaultOption.fileHandler

  cm: cm_t

  constructor(cm: cm_t) {
    this.cm = cm
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

    // only consider one format
    var fileHandlers = (typeof this.fileHandler === 'function') ? [this.fileHandler] : this.fileHandler
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

      for (let i = 0; i < fileHandlers.length; i++) {
        const fn = fileHandlers[i]
        if (fn(files, action)) {
          handled = true
          break
        }
      }

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
      var pos = cm.coordsChar({ left: ev.clientX, top: ev.clientY })
      cm.setCursor(pos)
      result = self.doInsert(ev.dataTransfer)
    })
    if (!result) return
    ev.preventDefault()
  }

  // Use FlipFlop to bind/unbind status
  public ff_paste = new FlipFlop(
    /* ON  */() => this.cm.on("paste", this.pasteHandle),
    /* OFF */() => this.cm.off("paste", this.pasteHandle)
  )

  public ff_drop = new FlipFlop(
    /* ON  */() => this.cm.on("drop", this.pasteHandle),
    /* OFF */() => this.cm.off("drop", this.pasteHandle)
  )
}

export { InsertFile, defaultOption }

/** HYPERMD ADDON DECLARATION */

const AddonAlias = "insertFile"
const AddonClassCtor = InsertFile
type AddonClass = InsertFile

const OptionName = "hmdInsertFile"
type OptionValueType = Partial<InserFileOptions> | boolean | FileHandler | FileHandler[]

declare global {
  namespace HyperMD {
    interface HelperCollection { [AddonAlias]?: AddonClass }
    interface EditorConfiguration { [OptionName]?: OptionValueType }
  }
}

export const getAddon = Addon.Getter(AddonAlias, AddonClassCtor)

CodeMirror.defineOption(OptionName, false,
  function (cm: cm_t, newVal: OptionValueType) {
    const enabled = !!newVal

    if (!enabled || newVal === true) {
      newVal = { byDrop: enabled, byPaste: enabled }
    } else if (typeof newVal === 'function' || newVal instanceof Array) {
      newVal = { byDrop: enabled, byPaste: enabled, fileHandler: newVal }
    } else if (typeof newVal !== 'object') {
      throw new Error("[HyperMD] wrong hmdInsertFile option value")
    }

    var newCfg = Addon.migrateOption(newVal, defaultOption)

    ///// apply config
    var inst = getAddon(cm)

    inst.ff_paste.setBool(newCfg.byPaste)
    inst.ff_drop.setBool(newCfg.byDrop)

    ///// write new values into cm
    for (var k in defaultOption) inst[k] = newCfg[k]
  }
)
