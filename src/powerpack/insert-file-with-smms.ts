// HyperMD PowerPack "insert-file-with-smms"
// This file is distributed under a WTFPL license http://www.wtfpl.net/
//
// POWERPACK for "addon/paste"
//
// Use http://sm.ms as the default destination when user wants to upload images.
//
// :bulb: **Hint**:
//
// Feel free to copy codes from this module, alter `Upload_One`,
// and make a new `FileHandler` which uploads images to somewhere else.
//
// :warning: **Attribution Required**
//
// If you are using this PowerPack, please add "Uploaded images are hosted by https://sm.ms" to your app
// 如果使用了此 PowerPack，请别忘记添加 “由 https://sm.ms 提供图床服务”

import { FileHandler, ajaxUpload, defaultOption } from "../addon/insert-file"

/**
 * Upload one image.
 *
 * @param callback called when finished/error. if success, a `url` is given
 */
export function Upload_One(file: File, callback: (url?: string) => void) {
  ajaxUpload(
    'https://sm.ms/api/upload',
    {
      smfile: file,
      format: 'json'
    },
    function (o, e) {
      const imgURL = (o && o.code == 'success') ? o.data.url : null
      callback(imgURL)
    }
  )
}

const spinGIF = 'data:image/gif;base64,R0lGODlhEAAQAMMMAAQEBIGBgby8vEJCQtzc3GJiYqCgoC8vL8zMzFRUVBkZGY+Pj+rq6nJycq2trQAAACH/C05FVFNDQVBFMi4wAwEAAAAh+QQJDAAPACwAAAAAEAAQAAAEVvDJSat9rDV2JSOPcRzGg4AUUwxnkjACcKASMQwCFShATiG+CSERSBE4HYohsegQEEhDoXl5ohjQpOVpYSAnjECD9iA4gpNFACTIwRBJxmLx1Z60eEkEACH5BAkIAA8ALAEAAQAOAA4AAARQ8EnJQmAzM/LEOMJDYFRTEITFCMdAEkUSTotyIBMyT4wzb6SMBLFAOBoG4eQAGAiQSgkzAYyKFpzHRhmUGLAaBG7iWGDEWkRWaXBYM4RxJgIAIfkECQwADwAsAQABAA4ADgAABE/wScnWYjNPkZJ4BDYtQWgxyJCITFAQmXEMsEQg2iPgtpgjC4Qg8Mk9BooCsJhDNkBGm6HG8NkSgYxjmmkAAEyEA0OAOQCKmkYoEag15VwEACH5BAkIAA8ALAEAAQAOAA4AAARO8EnJjGMzT9IaeQQ2OcZHPkjRiI+xfJOQFCwBZwKi7RTCEI6bpjEIAHW8xmHByzB8ExbFgZQgoBOD4nAj+BCHA0IQFkoCAAAzxCMkEuYIACH5BAkMAA8ALAEAAQAOAA4AAARP8MmJ0LyXhcWwFEIHPsTWSY5BXEjTnA+zYsjsYTLDCDa2DCre7RFIGIYTBuJU7D0Elg8A0Lg4DoMZQQFQDQYIwSABI1gWCsWRALsQCg1nBAAh+QQJCAAPACwBAAEADgAOAAAETPDJSci82BlMkUQeYTgXyFzEsl0nVn2LwEkMwQzAMT9G4+C6WU/AWFhmtRbC0ZoIjg/CQbGSCBKFlvRADAQYiEKjWXsIDgOZDeltSiIAIfkECQwADwAsAQABAA4ADgAABE7wyUnIvI8gKTbOCuA8jMU43iMAQHMRzjg1ifUyErKkWPkUisGHExAAE0PVjmCwDZ0IwQfhJAwGslyjgSNdBYzFotRYXHyCREKaJIm7kwgAIfkEBQgADwAsAQABAA4ADgAABE3wSUlKITMzHABYmcQMh0AMA4ZgEnIo4MQgSCY4TJiLyB5mgUHj13IQgkMiwTjzEScEwY/AelQSUujCIGsUeg4Dg7FwaDCERqP6NJhDEQA7'
const errorPNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAAP1BMVEWIioX29/bu7uz+//79/f3S0tL09PPy8vHw8O74+fjMAADU2ND6+vr39/bY3NW9vrzp6ubl5+Pi5N/e4duytLE6MtxfAAAAbUlEQVQY022PSRLDMAgEgZBhMXLW/781cqKDYrtvdPWBoRvNbOflD+qCZ7rQdX09H3dxcClvxeKQgX2LRSRFPGdhaRnmgiHcIgMw559wQ0Y2hrUheh+9YdQQaFFa1aCnf+jh0+sE77co0Xs3/wNPXARclYchfgAAAABJRU5ErkJggg=='

const supportBlobURL = typeof URL !== 'undefined'

interface UploadTask {
  name: string;
  url: string;
  placeholder: HTMLImageElement;
  blobURL: string;
}

/** ClassName for `<img>` placeholders */
const placeholderUploadingClass = "hmd-file-uploading"
const placeholderUploadedClass = "hmd-file-uploaded"

/**
 * SmMsFileHandler FileHandler
 *
 * accepts and uploads images, then inserts as `![](image_url)`
 */
export const SmMsFileHandler: FileHandler = function (files, action) {
  var unfinishedCount = 0

  /** a container for all uploading images */
  var placeholderForAll = document.createElement("span")
  placeholderForAll.className = "smms-hosted-items"
  action.setPlaceholder(placeholderForAll)

  var uploads: UploadTask[] = []

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    if (!/image\//.test(file.type)) continue

    const blobURL = supportBlobURL ? URL.createObjectURL(file) : spinGIF
    const name = file.name.match(/[^\\\/]+\.\w+$/)[0]
    const placeholder = document.createElement("img")

    placeholder.onload = resize // img size changed
    placeholder.className = placeholderUploadingClass
    placeholder.src = blobURL
    placeholderForAll.appendChild(placeholder)

    const task: UploadTask = {
      blobURL,
      name,
      url: null,
      placeholder,
    }
    uploads.push(task)
    unfinishedCount++

    Upload_One(file, uploadCallback.bind(null, task))
  }

  return uploads.length > 0

  //----------------------------------------------------------------------------

  function resize() { action.resize() }

  /** Once we uploaded a image, download it from server, preload for `fold` addon */
  function uploadCallback(task, url) {
    task.url = url || "error"

    const placeholder = task.placeholder
    placeholder.className = placeholderUploadedClass

    const _preloadDone = preloadCallback.bind(null, task)
    if (url) {
      const img = document.createElement("img")
      img.addEventListener("load", _preloadDone, false)
      img.addEventListener("error", _preloadDone, false)
      img.src = url
    } else {
      placeholder.src = errorPNG
      _preloadDone()
    }
  }

  function preloadCallback(task: UploadTask) {
    if (supportBlobURL) URL.revokeObjectURL(task.blobURL)

    if (--unfinishedCount === 0) {
      let texts = uploads.map(it => `![${it.name}](${it.url})`)
      action.finish(texts.join(" ") + " ")
    }
  }
}

defaultOption.fileHandler = SmMsFileHandler
