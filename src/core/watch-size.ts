import { debounce, visitElements } from "./utils";

/**
 * A lazy and simple Element size watcher. NOT WORK with animations
 */
export default function watchSize(el: HTMLElement, onChange: (newWidth: number, newHeight: number, oldWidth: number, oldHeight: number) => void, needPoll?: boolean) {
  var { width, height } = el.getBoundingClientRect()

  /** check size and trig onChange */
  var check = debounce(() => {
    var rect = el.getBoundingClientRect()
    var { width: newWidth, height: newHeight } = rect
    if (width != newWidth || height != newHeight) {
      onChange(newWidth, newHeight, width, height)
      width = newWidth
      height = newHeight

      setTimeout(check, 200) // maybe changed again later?
    }
  }, 100)

  var nextTimer = null
  function pollOnce() {
    if (nextTimer) clearTimeout(nextTimer)
    if (!stopped) nextTimer = setTimeout(pollOnce, 200)
    check()
  }

  var stopped = false
  function stop() {
    stopped = true
    check.stop()

    if (nextTimer) {
      clearTimeout(nextTimer)
      nextTimer = null
    }

    for (let i = 0; i < eventBinded.length; i++) {
      eventBinded[i][0].removeEventListener(eventBinded[i][1], check, false)
    }
  }

  var eventBinded: Array<[HTMLElement, string]> = []
  function bindEvents(el: HTMLElement) {
    const tagName = el.tagName
    const computedStyle = getComputedStyle(el)
    const getStyle = (name) => (computedStyle.getPropertyValue(name) || '')

    if (getStyle("resize") != 'none') needPoll = true

    // size changes if loaded
    if (/^(?:img|video)$/i.test(tagName)) {
      el.addEventListener('load', check, false)
      el.addEventListener('error', check, false)
    } else if (/^(?:details|summary)$/i.test(tagName)) {
      el.addEventListener('click', check, false)
    }
  }

  if (!needPoll) visitElements([el], bindEvents)

  // bindEvents will update `needPoll`
  if (needPoll) nextTimer = setTimeout(pollOnce, 200)

  return {
    check,
    stop,
  }
}
