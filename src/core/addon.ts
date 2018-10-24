/**
 * Utils and Basic Types/Functions for HyperMD addons
 */

import { cm_t } from "./type"

export interface AddonOptions {
}

export abstract class Addon {
  public cm: cm_t

  constructor(cm: cm_t) { }
}

/** make a Singleton getter function */
export function makeGetter<T extends Addon>(
  name: string,
  ClassCtor: { new(cm: cm_t): T; },
  defaultOption?: object
): (cm: cm_t) => T {
  return function (cm) {
    if (!cm.hmd) cm.hmd = {} as HyperMD.HelperCollection
    if (!cm.hmd[name]) {
      var inst = new ClassCtor(cm)
      cm.hmd[name] = inst
      if (defaultOption) {
        for (var k in defaultOption) inst[k] = defaultOption[k]
      }
      return inst
    }
    return cm.hmd[name]
  }
}

/**
 * make a Singleton getter function
 * @deprecated -- use `makeGetter` instead
 */
export const Getter = makeGetter;
