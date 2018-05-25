/**
 * Provides some universal utils
 *
 * @internal Part of HyperMD core.
 *
 * You shall NOT import this file; please import "core" instead
 */

/** Simple FlipFlop */
export class FlipFlop<T=boolean> {
  /**
   * Simple FlipFlop
   *
   * @param {function} on_cb
   * @param {function} off_cb
   * @param {T} [state] initial state. default: false (boolean)
   * @param {string} [subkey] if get an object, use this key to retrive status. default: "enabled"
   */
  constructor(
    private on_cb: (s: T) => void,
    private off_cb: (s: T) => void,
    public state: T = (false as any as T),
    private subkey: string = "enabled"
  ) {
  }

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
    if (this.state = newVal) this.on_cb(newVal)
    else this.off_cb(newVal)
  }

  setBool(state: boolean) {
    return this.set(state as any as T, true)
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
 * Polyfill of Object.assign
 */

export const assign: ((target, ...sources) => any) =
  Object['assign'] ||
  function (target, ...sources) {
    var to = Object(target)
    const hasOwnProperty = Object.prototype.hasOwnProperty

    for (const nextSource of sources) {
      if (nextSource != null) { // Skip over if undefined or null
        for (var nextKey in nextSource) {
          // Avoid bugs when hasOwnProperty is shadowed
          if (hasOwnProperty.call(nextSource, nextKey)) {
            to[nextKey] = nextSource[nextKey]
          }
        }
      }
    }
    return to
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
