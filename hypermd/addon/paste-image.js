// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/hypermd/LICENSE
//
// paste and upload image data (not file) from clipboard
//

(function (mod) {

  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(
      require("codemirror/lib/codemirror")
    );
  else if (typeof define == "function" && define.amd) // AMD
    define([
      "codemirror/lib/codemirror"
    ], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function (CodeMirror) {
  "use strict";

  /** 
   * @typedef {(imgurl:string, err:string)=>void} UploadCallback
   * 1st param is URL, 2nd is error message.
   */

  /**
   * send data to url
   * 
   * @param {string} url
   * @param {{[name:string]: string|File}} form
   * @param {UploadCallback} callback
   * @param {string} [method] - if not set, it will be `POST`
   */
  function ajaxUpload(url, form, callback, method) {
    var xhr = new XMLHttpRequest()
    var formData = new FormData()
    for (var name in form) formData.append(name, form[name])

    xhr.onreadystatechange = function () {
      if (4 == this.readyState) {
        var ret = xhr.responseText
        try { ret = JSON.parse(xhr.responseText) } catch (err) { }

        if (/^20\d/.test(xhr.status)) {
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

  //////////////////////////////////////////////////////////////////////////////

  function Paste(cm) {
    this.cm = cm
    this.enabled = false
    this.uploadTo = 'sm.ms'
    this.placeholderURL = defaultOption.placeholderURL

    this._pasteHandle = this.pasteHandle.bind(this)
    this._dropHandle = this.dropHandle.bind(this)
    this.updateUploader(this.uploadTo)
  }

  /** @type {{[name:string]:function(file:File,callback:UploadCallback)}} */
  var builtInUploader = {
    'sm.ms': function Upload_SmMs(file, callback) {
      ajaxUpload(
        'https://sm.ms/api/upload',
        {
          smfile: file,
          format: 'json'
        },
        function (o, e) {
          if (!o) { o = e || {}; o.code = 'error' }
          callback(o.code == 'success' && o.data.url, JSON.stringify(o, null, 2))
        }
      )
    }
  }

  /**
   * update `this.upload` method with `newVal`
   * 
   * @see {@link PasteImageUploader}
   * 
   * @param {string | PasteImageUploader} newUploader - the uploader name, or a uploader function.
   * @returns {PasteImageUploader} the final applied uploader function.
   */
  Paste.prototype.updateUploader = function (newUploader) {
    var uploadFunc = this.uploader, type = typeof newUploader

    if ('function' == type) {
      if (newUploader.length == 1) {
        // transform Promise style into callback style.
        uploadFunc = function (file, callback) {
          newUploader(file)
            .then(function (url) { callback(url, null) })
            .catch(function (err) { callback(null, err) })
        }
      } else {
        // callback style.
        uploadFunc = newUploader
      }
    }

    if ('string' == type && builtInUploader[newUploader]) {
      uploadFunc = builtInUploader[newUploader]
    }

    if (uploadFunc) { this.uploader = uploadFunc }
    else { delete this['uploader'] }

    return this.uploader
  }

  /**
   * @callback PasteImageUploader
   * @param {File} file
   * @param {UploadCallback} [callback]
   * @returns {Promise<string> | null}
   * 
   * PasteImageUploader(aka. PasteImage Upload Function) has two forms:
   * 
   * 1. ` ( file:File, callback: (url:string, err:string)=>void ) => void `
   *   - if failed to upload, the `url` shall be `null` and `err` shall be set.
   * 2. ` ( file:File ) => Promise<string> `
   */
  /**
   * The default upload function shall be overrided!
   */
  Paste.prototype.uploader = function (file, callback) {
    callback(null, "Uploader is not configured")
  }

  /**
   * upload a image and insert at the current cursor.
   * 
   * @param {DataTransfer} data
   * @returns {boolean} handled or not
   */
  Paste.prototype.doInsert = function (data) {
    var self = this, cm = self.cm

    if (!data || !data.files || 1 != data.files.length) return false
    var file = data.files[0]

    if (!/image\//.test(file.type)) return false
    if (!this.uploader) return false

    var placeholderURL = this.placeholderURL

    cm.operation(function () {
      cm.replaceSelection("![](" + placeholderURL + ")")
      var pos = cm.getCursor()

      // add a bookmark after the right paren ")"
      var bookmark = cm.setBookmark(pos)

      // start uploading
      self.uploader(file, function (url, err) {
        pos = bookmark.find()
        bookmark.clear()

        // if failed to upload, show message
        if (!url) {
          alert("Failed to upload image\n\n" + err)
          cm.setCursor(pos)
          return
        }

        // replace `Uploading` with the URL
        var
          pos1 = { line: pos.line, ch: pos.ch - 1 - placeholderURL.length },
          pos2 = { line: pos.line, ch: pos.ch - 1 }
        cm.replaceRange(url, pos1, pos2)

        // update `<img>` if the text is folded
        var marks = cm.findMarksAt(pos1)
        for (var i = 0; i < marks.length; i++) {
          var mark = marks[i]
          if (mark.className == "hmd-fold-image") {
            mark.replacedWith.src = url
            break
          }
        }
      })
    })

    return true
  }

  /** 
   * 'paste' event handler
   * 
   * @param {ClipboardEvent} ev 
   */
  Paste.prototype.pasteHandle = function (cm, ev) {
    if (!this.doInsert(ev.clipboardData || window.clipboardData)) return
    ev.preventDefault()
  }

  /** 
   * 'drop' event handler
   * 
   * @param {DragEvent} ev 
   */
  Paste.prototype.dropHandle = function (cm, ev) {
    if (!this.doInsert(ev.dataTransfer)) return
    ev.preventDefault()
  }

  Paste.prototype.bind = function () {
    this.cm.on('paste', this._pasteHandle)
    this.cm.on('drop', this._dropHandle)
  }

  Paste.prototype.unbind = function () {
    this.cm.off('paste', this._pasteHandle)
    this.cm.off('drop', this._dropHandle)
  }

  /** get Paste instance of `cm`. if not exists, create one. 
   * @returns {Paste} */
  function getPaste(cm) {
    if (!cm.hmd) cm.hmd = {}
    else if (cm.hmd.pasteImage) return cm.hmd.pasteImage

    var paste = new Paste(cm)
    cm.hmd.pasteImage = paste
    return paste
  }

  var defaultOption = { // exposed options from Paste class
    enabled: false,
    uploadTo: 'sm.ms',
    // before image is uploaded, a placeholder is applied. see hypermd-image-uploading.svg
    placeholderURL: 'Uploading.gif',
  }

  CodeMirror.defineOption("hmdPasteImage", false, function (cm, newVal) {
    // complete newCfg with default values
    var paste = getPaste(cm)
    var newCfg = {}

    if (!newVal || newVal === true) newVal = { enabled: !!newVal }
    else if (/string|function/.test(typeof newVal)) newVal = { enabled: true, uploadTo: newVal }
    else if (typeof newVal !== 'object') {
      throw new Error("[HyperMD paste-image] wrong hmdPasteImage option value")
    }

    for (var k in defaultOption) {
      newCfg[k] = newVal.hasOwnProperty(k) ? newVal[k] : defaultOption[k]
    }

    /////

    if (paste.enabled != newCfg.enabled) {
      newCfg.enabled ? paste.bind() : paste.unbind()
    }
    paste.updateUploader(newCfg.uploadTo)

    /////
    // write new values into cm
    for (var k in defaultOption) {
      paste[k] = newCfg[k]
    }
  })


  /** exports, for test */
  return {
    ajaxUpload: ajaxUpload,
    builtInUploader: builtInUploader,
    Paste: Paste
  }
})
