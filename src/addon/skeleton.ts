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
//#region CodeMirror Extension
// add a method named as "ExtName" to all CodeMirror editors

const ExtName = "hmdMyExtension"
export const ExtObject = function (this: cm_t, foo: string, bar: string) {
  // implement your extension method
}

declare global { namespace HyperMD { interface Editor { [ExtName]: typeof ExtObject } } }
CodeMirror.defineExtension(ExtName, ExtObject)

//#endregion

/********************************************************************************** */
//#region Addon Options

export interface MyOptions extends Addon.AddonOptions {
  enabled: boolean

  // add your options here
}

export const defaultOption: MyOptions = {
  enabled: false,

  // add your default values here
}

const OptionName = "hmdMyAddon"
type OptionValueType = Partial<MyOptions> | boolean;

CodeMirror.defineOption(OptionName, defaultOption, function (cm: cm_t, newVal: OptionValueType) {
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

//#endregion

/********************************************************************************** */
//#region Addon Class

const AddonAlias = "myAddon"
export class MyAddon implements Addon.Addon, MyOptions /* if needed */ {
  enabled: boolean;

  public ff_enable: FlipFlop  // bind/unbind events

  constructor(public cm: cm_t) {
    // options will be initialized to defaultOption (if exists)
    // add your code here

    this.ff_enable = new FlipFlop(
      /* ON  */() => {/* bind events here  */ },
      /* OFF */() => {/* ubind events here */ }
    )
  }
}

//#endregion

/** ADDON GETTER (Singleton Pattern): a editor can have only one MyAddon instance */
export const getAddon = Addon.Getter(AddonAlias, MyAddon, defaultOption /** if has options */)
declare global { namespace HyperMD { interface HelperCollection { [AddonAlias]?: MyAddon } } }
