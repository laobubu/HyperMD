export function sleep(time_ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(() => { resolve() }, time_ms))
}

/** a simple assert function; you can always use other 3rd asserting libs! */
export function assert(val: any, message?: string) {
  if (!val) throw new Error(message || "Assertion Failed")
}
