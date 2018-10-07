/**
 * Provides some universal utils for plain js and DOM
 */

import * as CodeMirror from "codemirror"
import './polyfill'

/** async run a function, and retry up to N times until it returns true */
export function tryToRun(fn: () => boolean, times?: number, onFailed?: Function) {
  times = ~~times || 5
  var delayTime = 250

  function nextCycle() {
    if (!times--) {
      if (onFailed) onFailed()
      return
    }

    try { if (fn()) return }
    catch (e) { }

    setTimeout(nextCycle, delayTime)
    delayTime *= 2
  }

  setTimeout(nextCycle, 0)
}

/**
 * make a debounced function
 *
 * @param {Function} fn
 * @param {number} delay in ms
 */
export function debounce(fn: Function, delay: number): { (): void; stop(): void } {
  var deferTask = null
  var notClearBefore = 0
  var run = function () { fn(); deferTask = 0; }

  var ans = function () {
    var nowTime = +new Date()
    if (deferTask) {
      if (nowTime < notClearBefore) return
      else clearTimeout(deferTask)
    }
    deferTask = setTimeout(run, delay)
    notClearBefore = nowTime + 100  // allow 100ms error
  } as any

  ans.stop = function () {
    if (!deferTask) return
    clearTimeout(deferTask)
    deferTask = 0
  }

  return ans
}

/**
 * addClass / removeClass etc.
 *
 * using CodeMirror's (although they're legacy API)
 */

export const contains = CodeMirror.contains

/**
 * a fallback for new Array(count).fill(data)
 */

export function repeat<T>(item: T, count: number): T[] {
  var ans = new Array(count) as T[]
  if (ans['fill']) ans['fill'](item)
  else for (let i = 0; i < count; i++) ans[i] = item
  return ans
}

export function repeatStr(item: string, count: number): string {
  var ans = ""
  while (count-- > 0) ans += item
  return ans
}

/**
 * Visit element nodes and their children
 */
export function visitElements(seeds: ArrayLike<HTMLElement>, handler: (el: HTMLElement) => void) {
  var queue: ArrayLike<HTMLElement>[] = [seeds], tmp: ArrayLike<HTMLElement>

  while (tmp = queue.shift()) {
    for (let i = 0; i < tmp.length; i++) {
      const el = tmp[i]
      if (!el || el.nodeType != Node.ELEMENT_NODE) continue
      handler(el)
      if (el.children && el.children.length > 0) queue.push(el.children as any as ArrayLike<HTMLElement>)
    }
  }
}

/**
 * check if has the class and remove it
 * @returns element className changed or not
 */
export function rmClass(el: HTMLElement, className: string): boolean {
  if (el.classList) {
    if (!el.classList.contains(className)) return false
    el.classList.remove(className)
    return true
  } else {
    let c = ' ' + el.className + ' ', cnp = ' ' + className + ' '
    if (c.indexOf(cnp) === -1) return false
    el.className = c.replace(cnp, '').trim()
    return true
  }
}

/**
 * check if NOT has the class and add it
 * @returns element className changed or not
 */
export function addClass(el: HTMLElement, className: string): boolean {
  if (el.classList) {
    if (el.classList.contains(className)) return false
    el.classList.add(className)
    return true
  } else {
    let c = ' ' + el.className + ' ', cnp = ' ' + className + ' '
    if (c.indexOf(cnp) !== -1) return false
    el.className = (el.className + ' ' + className)
    return true
  }
}

/**
 * a fallback for old browsers that not support Symbol
 */
export function makeSymbol(name: string): symbol | string {
  if (typeof Symbol === 'function') return Symbol(name)
  return "_\n" + name + "\n_" + Math.floor(Math.random() * 0xFFFF).toString(16)
}
