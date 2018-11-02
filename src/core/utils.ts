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
 * @param {number} delay in ms
 */
export function debounce<T extends Function>(fn: T, delay: number): { (): void; stop(): void; immediate: T; _fn: T } {
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

  ans.immediate = function (...args) {
    ans.stop()
    return fn(...args)
  }

  ans._fn = fn

  return ans
}

/**
 * Check if a element is inside another.
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
 * Simplified `_.isEqual`, with a recursive comparison strategy.
 *
 * Only for simple and small objects / arrays. Circular references will crash this function!
 */
export function isEqual(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) return true  // null===null, primitive===primitive, same_obj===same_obj

  if (typeof obj1 === 'object') {
    if (!obj1 || !obj2) return false  // one of them can't be null

    const hasOwnProperty = Object.prototype.hasOwnProperty
    for (let k in obj1) {
      if (hasOwnProperty.call(obj1, k) && !isEqual(obj2[k], obj1[k])) return false
    }
    for (let k in obj2) {
      if (hasOwnProperty.call(obj2, k) && !hasOwnProperty.call(obj1, k)) return false
    }
    return true
  } else {
    // primitive comparison failed before
    return false
  }
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

/** Create element */
export function elt<TagName extends keyof HTMLElementTagNameMap>(tag: TagName, attrs?: Record<string, string | true>, content?: string | NodeList | Node[]): HTMLElementTagNameMap[TagName];
export function elt(tag: string, attrs?: Record<string, string | true>, content?: string | NodeList | Node[]): HTMLElement;

export function elt(tag: string, attrs?: Record<string, string | true>, content?: string | NodeList | Node[]) {
  var el = document.createElement(tag)
  if (attrs) for (var attr in attrs) {
    let val = attrs[attr]
    el.setAttribute(attr, "" + val);
  }
  if (typeof content === 'string') el.textContent = content;
  else if (content && content.length > 0) [].slice.call(content).forEach(child => el.appendChild(child));
  return el;
}

/**
 * Normalize a (potentially-with-title) URL string
 *
 * @param content eg. `http://laobubu.net/page "The Page"` or just a URL
 */
export function splitLink(content: string) {
  // remove title part (if exists)
  content = content.trim()
  var url = content, title = ""
  var mat = content.match(/^(\S+)\s+("(?:[^"\\]+|\\.)+"|[^"\s].*)/)
  if (mat) {
    url = mat[1]
    title = mat[2]
    if (title.charAt(0) === '"') title = title.substr(1, title.length - 2).replace(/\\"/g, '"')
  }

  return { url, title }
}

/**
 * Check if URL is relative URL, and add baseURI if needed
 *
 * @example
 *
 *     resolve("laobubu<at>gmail.com") // => "mailto:laobubu<at>gmail.com"
 *     resolve("../world.png") // => "../world.png"
 *     resolve("../world.png", "http://laobubu.net/xxx/foo/") // => "http://laobubu.net/xxx/world.png"
 *     resolve("../world.png", "http://laobubu.net/xxx/foo") // => "http://laobubu.net/xxx/world.png"
 *     resolve("/world.png", "http://laobubu.net/xxx/foo/") // => "http://laobubu.net/world.png"
 */
export function resolveURI(uri: string, baseURI?: string) {
  const emailRE = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/

  const hostExtract = /^(?:[\w-]+\:\/*|\/\/)[^\/]+/
  const levelupRE = /\/[^\/]+(?:\/+\.?)*$/

  if (!uri) return uri
  if (emailRE.test(uri)) return "mailto:" + uri

  var tmp: RegExpMatchArray
  var host = ""

  baseURI = baseURI || ""

  // not configured, or is already URI with scheme
  if (!baseURI || hostExtract.test(uri)) return uri

  // try to extract scheme+host like http://laobubu.net without tailing slash
  if (tmp = baseURI.match(hostExtract)) {
    host = tmp[0];
    baseURI = baseURI.slice(host.length)
  }

  while (tmp = uri.match(/^(\.{1,2})([\/\\]+)/)) {
    uri = uri.slice(tmp[0].length)
    if (tmp[1] == "..") baseURI = baseURI.replace(levelupRE, "")
  }

  if (uri.charAt(0) === '/' && host) {
    uri = host + uri
  } else {
    if (!/\/$/.test(baseURI)) baseURI += "/"
    uri = host + baseURI + uri
  }

  return uri
}
