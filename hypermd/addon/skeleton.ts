// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
//
// Skeleton for most Addons
// NOTE: some parts might be useless for you, feel free to delete them.
//

import CodeMirror from 'codemirror'
import { Addon, FlipFlop } from '../core'
import { cm_t } from '../core/type'


/********************************************************************************** */
/** ADDON OPTIONS */

export interface MyOptions extends Addon.AddonOptions {
  enabled: boolean

  // add your options here
}

export const defaultOption: MyOptions = {
  enabled: false,

  // add your default values here
}

const OptionName = "hmdMyAddon"
type OptionValueType = Partial<MyOptions> | boolean

CodeMirror.defineOption(OptionName, false, function (cm: cm_t, newVal: OptionValueType) {
  const enabled = !!newVal

  if (!enabled || typeof newVal === "boolean") {
    newVal = { enabled: enabled }
  }

  var newCfg = Addon.migrateOption(newVal, defaultOption)

  ///// apply config
  var inst = getAddon(cm)

  inst.ff_enable.setBool(newCfg.enabled)

  ///// write new values into cm
  for (var k in defaultOption) inst[k] = newCfg[k]
})

declare global { namespace HyperMD { interface EditorConfiguration { [OptionName]?: OptionValueType } } }


/********************************************************************************** */
/** ADDON CLASS */

const AddonAlias = "myAddon"
export class MyAddon implements Addon.Addon, MyOptions /* if needed */ {
  enabled: boolean;

  public ff_enable: FlipFlop  // bind/unbind events

  constructor(public cm: cm_t) {
    // add your code here

    this.ff_enable = new FlipFlop(
      /* ON  */() => {/* bind events here  */ },
      /* OFF */() => {/* ubind events here */ }
    )
  }
}


declare global { namespace HyperMD { interface HelperCollection { [AddonAlias]?: MyAddon } } }

/** ADDON GETTER: Only one addon instance allowed in a editor */
export const getAddon = Addon.Getter(AddonAlias, MyAddon, defaultOption /** if has options */)


/********************************************************************************** */
/** ADDON HELPER:
 * add a method named as "HelperName"
 * to all CodeMirror editors */

const HelperName = "hmdMyHelper"
const HelperObject = function (this: cm_t, foo: string, bar: string) {
  // implement your helper method
}

declare global { namespace HyperMD { interface Editor { [HelperName]: typeof HelperObject } } }
CodeMirror.defineExtension(HelperName, HelperObject)
