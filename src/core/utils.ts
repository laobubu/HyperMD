/**
 * Provides some universal utils
 *
 * @internal Part of HyperMD core.
 *
 * You shall NOT import this file; please import "core" instead
 */

import './polyfill'

/** Simple FlipFlop */
export class FlipFlop<T=boolean> {
  /**
   * Simple FlipFlop
   *
   * @param {function} on_cb see FlipFlop.ON(callback)
   * @param {function} off_cb see FlipFlop.OFF(callback)
   * @param {T} [state] initial state. default: false (boolean)
   * @param {string} [subkey] if get an object, use this key to retrive status. default: "enabled"
   */
  constructor(
    private on_cb?: (s: T) => void,
    private off_cb?: (s: T) => void,
    public state: T = (false as any as T),
    private subkey: string = "enabled"
  ) {
  }

  /** set a callback when state is changed and is **NOT** `null`, `false` etc. */
  ON(callback: (s: T) => void) { this.on_cb = callback; return this }

  /** set a callback when state is set to `null`, `false` etc. */
  OFF(callback: (s: T) => void) { this.off_cb = callback; return this }

  /**
   * Update FlipFlop status, and trig callback function if needed
   *
   * @param {T|object} state new status value. can be a object
   * @param {boolean} [toBool] convert retrived value to boolean. default: false
   */
  set(state: T | object, toBool?: boolean) {
    let newVal: T = (typeof state === 'object' && state) ? state[this.subkey] : state

    if (toBool) newVal = !!newVal as any as T

    if (newVal === this.state) return
    if (this.state = newVal) { this.on_cb && this.on_cb(newVal) }
    else { this.off_cb && this.off_cb(newVal) }
  }

  setBool(state: boolean) {
    return this.set(state as any as T, true)
  }

  /**
   * Bind to a object's property with `Object.defineProperty`
   * so that you may set state with `obj.enable = true`
   */
  bind<U>(obj: U, key: keyof U, toBool?: boolean) {
    Object.defineProperty(obj, key, {
      get: () => this.state,
      set: (v) => this.set(v, toBool),
    })
    return this
  }
}

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
