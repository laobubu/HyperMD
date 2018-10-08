/** @hypermd as CompleteEmoji */

import * as CodeMirror from "codemirror"
import * as FoldEmoji from "../addon/fold-emoji"

import 'codemirror/addon/hint/show-hint'
import 'codemirror/addon/hint/show-hint.css'

/**
 * Create a hint function for codemirror/addon/hint/show-hint
 * and a HyperMD editor with fold-emoji actived
 *
 * @see https://codemirror.net/doc/manual.html#addon_show-hint
 * @see https://laobubu.net/HyperMD/docs/examples/custom-emoji.html -- check the source code and find `createHintFunc`
 */
export function createHintFunc() {
  var editor: CodeMirror.Editor = null
  var defaultDict = FoldEmoji.defaultDict

  var previewShown = false
  var previewContainer = document.createElement('div')
  previewContainer.setAttribute('class', 'CodeMirror-hints HyperMD-complete-preview')

  return function (cm: CodeMirror.Editor, options) {
    editor = cm

    var cursor = cm.getCursor(), line = cm.getLine(cursor.line)
    var start = cursor.ch, end = cursor.ch
    while (start && /[-\w:]/.test(line.charAt(start - 1)))--start
    while (end < line.length && /[-\w:]/.test(line.charAt(end)))++end

    if (start === end) {
      hidePreview()
      return null
    }

    var word = line.slice(start, cursor.ch).toLowerCase()
    var wordEmpty = word.length === 0

    var dicts: Array<Record<string, string>> = [defaultDict]
    var myEmojiDict = (editor.getOption('hmdFoldEmoji') || {}).myEmoji
    if (myEmojiDict) dicts.push(myEmojiDict)

    var result = {
      list: [],
      from: CodeMirror.Pos(cursor.line, start),
      to: CodeMirror.Pos(cursor.line, end)
    }

    var list = result.list
    for (var i = 0; i < dicts.length; i++) {
      var dict = dicts[i]
      if (!dict) continue
      for (var key in dict) {
        if (wordEmpty || key.slice(0, word.length) === word) {
          list.push(key)
        }
      }
    }

    CodeMirror.on(result, "select", showPreview)
    CodeMirror.on(result, "close", hidePreview)

    return result
  }

  function hidePreview() {
    if (previewShown) {
      document.body.removeChild(previewContainer)
      previewShown = false
    }
  }

  function showPreview(completion: string, element: HTMLElement) {
    var foldEmoji = FoldEmoji.getAddon(editor)

    var newNode: Node =
      ((completion in foldEmoji.myEmoji) && foldEmoji.myEmoji[completion](completion))
      || foldEmoji.emojiRenderer(completion)
      || document.createTextNode(defaultDict[completion])
      || null

    if (newNode) { // yes, this is a emoji
      if (!previewShown) {
        previewShown = true
        document.body.appendChild(previewContainer)
      }

      var oldNode = previewContainer.firstChild
      if (oldNode) previewContainer.removeChild(oldNode)
      previewContainer.appendChild(newNode)

      var loc = element.parentElement.style
      var pcStyle = previewContainer.style
      pcStyle.left = parseFloat(loc.left) + element.parentElement.offsetWidth + 'px'
      pcStyle.top = loc.top
    } else {
      hidePreview()
    }
  }
}
