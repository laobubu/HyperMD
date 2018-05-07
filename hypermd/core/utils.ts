// Common js utils

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
    private on_cb: Function,
    private off_cb: Function,
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
  set(state: T | object, toBool: boolean) {
    let newVal: T = typeof state === 'object' ? state[this.subkey] : state

    if (toBool) newVal = !!newVal as any as T

    if (newVal === this.state) return
    if (this.state = newVal) this.on_cb(this)
    else this.off_cb(this)
  }

  setBool(state: boolean) {
    return this.set(state as any as T, true)
  }
}

/**
 * execute a function, and async retry if it doesn't returns true
 */
export function tryToRun(fn, times) {
  times = ~~times || 5
  var delayTime = 250

  function nextCycle() {
    if (!times--) return

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
