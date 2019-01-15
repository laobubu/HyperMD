import { Test } from "hypermd_test/tester";
import { cm, init, destory, querySelector } from "hypermd_test/addon/_base";
import { sleep, assert } from "hypermd_test/utils";

import { registerRenderer, FoldInfo } from "hypermd/addon/fold-code"

export const test = new Test('Addon: FoldCode')

var onRemoveTrigged1: boolean, onRemoveTrigged2: boolean
var foldInfo1: FoldInfo, foldInfo2: FoldInfo

function getRenderedElement(type: string, not_throw_error?: boolean) {
  return querySelector(`[data-foldcode-test=${type}]`, not_throw_error)
}

test.add('init', () => {
  /**
   * First of all, we create 2 CodeRenderer
   *
   * "test1" for code blocks with language "test1-lang"
   * "test2" for code blocks with language "foo" or "bar"
   */

  foldInfo2 = null
  onRemoveTrigged1 = false
  onRemoveTrigged2 = false

  registerRenderer({
    name: "test1",
    pattern: "test1-lang",
    renderer: (code, info) => {
      var el = document.createElement("pre")
      el.setAttribute("style", "border: 2px dashed #C00; font-family: monospace")
      el.setAttribute("data-foldcode-test", "test1")
      el.textContent = code

      foldInfo1 = info
      info.onRemove = () => { onRemoveTrigged1 = true }

      return el
    },
    suggested: false,
  })

  registerRenderer({
    name: "test2",
    pattern: /^(foo|bar)$/i,
    renderer: (code, info) => {
      var el = document.createElement("pre")
      el.setAttribute("style", "border: 2px dashed #0C0; font-family: monospace")
      el.setAttribute("data-foldcode-test", "test2")
      el.textContent = code

      foldInfo2 = info
      info.onRemove = () => { onRemoveTrigged2 = true }

      return el
    },
    suggested: true,
  })

  init();
  return true
})

//-------------------------------------------------------------------------//

test.add('suggested renderer', async () => {
  /** prepare the text */
  cm.setValue(`Test text
\`\`\`foo
some code here
yayaya
hoho
\`\`\`

\`\`\`test1-lang
code2
more lines
...
\`\`\`
`)
  cm.setCursor({ line: 0, ch: 0 })

  /** wait until folded */
  await sleep(500)

  /**
   * "test1" is not "suggested" renderer and we didn't active it via hmdFoldCode
   * therefore it shall not work
   */

  assert(!getRenderedElement("test1", true), "At this moment test1 shall not work!")


  /**
   * however, "test2" is "suggested" renderer. when `hmdFold.code` is true,
   * it shall work even if we didn't active it via hmdFoldCode
   */

  let el = getRenderedElement("test2")
  assert(el.textContent === "some code here\nyayaya\nhoho\n")

  return true
})

test.add('active and deactive renderers via setOption', async () => {
  /**
   * now let's disable "test2" and enable "test1"
   */
  cm.setOption("hmdFoldCode", { test1: true, test2: false })

  /** wait until folded */
  await sleep(500)

  /**
   * now "test2" shall not work
   */
  assert(!getRenderedElement("test2", true), "At this moment test2 shall not work!")


  /**
   * "test1" is enabled and shall work
   */
  let el = getRenderedElement("test1")
  assert(el.textContent === "code2\nmore lines\n...\n")
  return true
})

test.add('info.onRemove', async () => {
  /** renderer function can set `onRemove` callback */

  /** the old "test2" was removed, and onRemove shall be called. */
  assert(onRemoveTrigged2)

  /** now let's break "test1", by moving cursor into it */
  cm.setCursor({ line: 9, ch: 0 })

  await sleep(100)

  assert(!getRenderedElement("test1", true), "test1 shall be removed!")
  assert(onRemoveTrigged1)

  return true
})

test.add('info.break', async () => {
  /** bring test1 back */

  onRemoveTrigged1 = false
  foldInfo1 = null

  cm.setCursor({ line: 0, ch: 0 })

  await sleep(100)

  assert(foldInfo1)
  getRenderedElement("test1")

  /** test info.break() */

  foldInfo1.break()

  await sleep(100)

  assert(!getRenderedElement("test1", true), "test1 shall be removed!")
  assert(onRemoveTrigged1)
  assert(cm.getCursor().line === 7, 'cursor shall moved to line 8')

  return true
})

//-------------------------------------------------------------------------//

test.add('destory editor', () => {
  destory();
  foldInfo1 = foldInfo2 = null
  return true
})
