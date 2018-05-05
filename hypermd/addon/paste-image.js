// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/hypermd/LICENSE
//
// paste and upload image data (not file) from clipboard
//

(function (mod) {

  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(
      require("codemirror/lib/codemirror"),
      require("blueimp-canvas-to-blob"),
      require("blueimp-load-image"),
      require("./../hypermd")
    );
  else if (typeof define == "function" && define.amd) // AMD
    define([
      "codemirror/lib/codemirror",
      "blueimp-canvas-to-blob",
      "blueimp-load-image",
      "./../hypermd",
    ], mod);
  else // Plain browser env
    mod(CodeMirror, dataURLtoBlob, loadImage, HyperMD);
})(function (CodeMirror, dataURLtoBlob, loadImage, HyperMD) {
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
    this.enabledDrop = false
    this.enableThumbnail = defaultOption.enableThumbnail
    this.thumbnailMaxWidth = defaultOption.thumbnailMaxWidth
    this.thumbnailMaxHeight = defaultOption.thumbnailMaxHeight
    this.uploadTo = 'sm.ms'
    this.placeholderURL = defaultOption.placeholderURL
    this.placeholderURLNonImage = defaultOption.placeholderURLNonImage
    
    this.updateUploader(this.uploadTo)

    this._doInsertWithThumbnailHandle = this.doInsertWithThumbnail.bind(this)

    // use FlipFlop to bind/unbind event listeners

    var _pasteHandle = this.pasteHandle.bind(this)
    var _dropHandle = this.dropHandle.bind(this)

    this._ff_paste = new HyperMD.FlipFlop(
      function () { cm.on('paste', _pasteHandle) },
      function () { cm.off('paste', _pasteHandle) },
      false
    )
    this._ff_drop = new HyperMD.FlipFlop(
      function () { cm.on('drop', _dropHandle) },
      function () { cm.off('drop', _dropHandle) },
      false
    )
  }

  /** @type {{[name:string]:function(file:File,callback:UploadCallback)}} */
  var builtInUploader = {
    'sm.ms': function Upload_SmMs(file, thumbBlobIfAny, callback) {
      // thumbBlobIfAny is ignored for sm.ms -> just upload the large file
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
        uploadFunc = function (file, thumbBlob, callback) {
          newUploader(file, thumbBlob)
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
   * 1. ` ( file:File, thumbBlob: Blob | null, callback: (url:string, err:string)=>void ) => void `
   *   - if failed to upload, the `url` shall be `null` and `err` shall be set.
   * 2. ` ( file:File, thumbBlob: Blob | null ) => Promise<string> `
   */
  /**
   * The default upload function shall be overrided!
   */
  Paste.prototype.uploader = function (file, thumbBlobIfAny, callback) {
    callback(null, "Uploader is not configured")
  }

  Paste.prototype.doInsertWithThumbnail = function (blob, thumbBlobIfAny, blobUrlIfAny, isImage) {
    var self = this, cm = self.cm

    var placeholderURL = isImage ? this.placeholderURL : this.placeholderURLNonImage
    if (blobUrlIfAny) placeholderURL = placeholderURL.replace('<BlobURL>', blobUrlIfAny)

    cm.operation(function () {
      cm.replaceSelection("![](" + placeholderURL + ")")
      var pos = cm.getCursor()

      // add a bookmark after the right paren ")"
      var bookmark = cm.setBookmark(pos)

      // start uploading
      self.uploader(blob, thumbBlobIfAny, function (url, err) {
        pos = bookmark.find()
        bookmark.clear()

        // if a blobURL was created. revoke it
        if (blobUrlIfAny) URL.revokeObjectURL(blobUrlIfAny)

        // if failed to upload, show message
        if (!url) {
          alert("Failed to upload file\n\n" + err)
          cm.setCursor(pos)
          return
        }

        // replace `Uploading` with the URL
        var
          pos1 = { line: pos.line, ch: pos.ch - 1 - placeholderURL.length },
          pos2 = { line: pos.line, ch: pos.ch - 1 }

        if (!isImage) { // if not image, replace the whole placeholder: ![](...)
          pos1.ch = pos1.ch - 4
          pos2.ch = pos2.ch + 1
        }
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
   * upload a image and insert at the current cursor.
   * 
   * @param {DataTransfer} data
   * @returns {boolean} handled or not
   */
  Paste.prototype.doInsert = function (data) {
    var self = this, cm = self.cm

    if (!data || !data.files || 1 != data.files.length) return false
    var file = data.files[0]

    if (!this.uploader) return false
    var isImage = /image\//.test(file.type)

    var useUploadImageAsPlaceholder = (isImage && this.placeholderURL.indexOf('<BlobURL>') !== -1 && typeof URL !== 'undefined')
    if (useUploadImageAsPlaceholder) {
      if (!this.enableThumbnail) { // if use full image
        return this._doInsertWithThumbnailHandle(file, null, URL.createObjectURL(file), isImage)
      }

      // if thumbnail required
      loadImage(file,
        function (imageCanvas) {
          imageCanvas.toBlob(function (thumbnailBlob) {
            self._doInsertWithThumbnailHandle(file, thumbnailBlob, URL.createObjectURL(thumbnailBlob), isImage)
          }, "image/jpeg", 0.85)
        },
        {
          maxWidth: this.thumbnailMaxWidth,
          maxHeight: this.thumbnailMaxHeight,
          canvas: true
        }
      )
      return true
    }
    else { // use user-defined placeholder that is not the current image
      return this._doInsertWithThumbnailHandle(file, null, null, isImage);
    }
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
    var self = this, cm = this.cm, result = false
    cm.operation(function () {
      var pos = cm.coordsChar({ left: ev.clientX, top: ev.clientY })
      cm.setCursor(pos)
      result = self.doInsert(ev.dataTransfer)
    })
    if (!result) return
    ev.preventDefault()
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
    enabledDrop: false,
    uploadTo: 'sm.ms',
    enableThumbnail: false, // true to show image thumbnail as placeholder, false to show full image
    thumbnailMaxWidth: 260,
    thumbnailMaxHeight: 140,
    // before image is uploaded, a placeholder is applied.
    // you may use <BlobURL> to display what user just submitted
    placeholderURL: '<BlobURL>',
    placeholderURLNonImage: '/hypermd-image-spin.gif',
  }

  CodeMirror.defineOption("hmdPasteImage", false, function (cm, newVal) {
    // complete newCfg with default values

    /** @type {typeof defaultOption} */
    var newCfg = {}
    var paste = getPaste(cm)

    if (!newVal || newVal === true) newVal = { enabled: !!newVal }
    else if (/string|function/.test(typeof newVal)) newVal = { enabled: true, uploadTo: newVal }
    else if (typeof newVal !== 'object') {
      throw new Error("[HyperMD paste-image] wrong hmdPasteImage option value")
    }

    for (var k in defaultOption) {
      newCfg[k] = newVal.hasOwnProperty(k) ? newVal[k] : defaultOption[k]
    }

    /////

    paste.updateUploader(newCfg.uploadTo)
    paste._ff_paste.setBool(newCfg && newCfg.enabled)
    paste._ff_drop.setBool(newCfg && newCfg.enabledDrop)

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
