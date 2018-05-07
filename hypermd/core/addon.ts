import { cm_t } from "./type"

export interface AddonOptions {
}

export abstract class Addon {
  public cm: cm_t

  constructor(cm: cm_t) { }
}

/**
 * returns a Singleton getter
 */
export function Getter<T extends Addon>(
  name: string,
  ClassCtor: { new(cm: cm_t): T; }
): (cm: cm_t) => T {
  return function (cm) {
    if (!cm.hmd) cm.hmd = {}
    if (!cm.hmd[name]) cm.hmd[name] = new ClassCtor(cm)
    return cm.hmd[name]
  }
}

/** Simple version of Object.assign */
export function migrateOption<T>(newVal: object, defval: T): T {
  var dst = {} as T
  for (var k in defval) {
    dst[k] = newVal.hasOwnProperty(k) ? newVal[k as string] as any : defval[k]
  }
  return dst
}
