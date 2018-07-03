// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
//
// DESCRIPTION: (Replace this with your one-line description)
//
// =============================================
// **START AN ADDON** Check List
// =============================================
// 1. Replace "MyAddon" to your addon's name (note the first letter is upper-case)
// 2. Edit #region CodeMirror Extension
//    - If don't need this, delete the whole region
//    - Otherwise, delete hmdRollAndDice and add your own functions
// 3. Edit #region Addon Class
//    - You might want to reading CONTRIBUTING.md
// 4. Edit #region Addon Options
//    - It's highly suggested to finish the docs, see //TODO: write doc
//    - Note the defaultOption shall be the status when this addon is disabled!
//    - As for `FlipFlop` and `ff_*`, you might want to reading CONTRIBUTING.md
// 5. Modify `DESCRIPTION: ` above
// 6. Remove this check-list
// 7. Build, Publish, Pull Request etc.
//

import * as CodeMirror from 'codemirror'
import { Addon, FlipFlop, suggestedEditorConfig } from '../core'
import { cm_t } from '../core/type'


/********************************************************************************** */
//#region CodeMirror Extension
// add methods to all CodeMirror editors

// every codemirror editor will have these member methods:
export const Extensions = {
  hmdRollAndDice(this: cm_t, foo: string, bar: string) {
    return 42
  }
}

export type ExtensionsType = typeof Extensions
declare global { namespace HyperMD { interface Editor extends ExtensionsType { } } }

for (var name in Extensions) {
  CodeMirror.defineExtension(name, Extensions[name])
}

//#endregion

/********************************************************************************** */
//#region Addon Options

export interface Options extends Addon.AddonOptions {
  /** Enable MyAddon features or not. */ // TODO: write doc here
  enabled: boolean

  // add your options here
}

export const defaultOption: Options = {
  enabled: false,

  // add your default values here
}

export const suggestedOption: Partial<Options> = {
  enabled: true,  // we recommend lazy users to enable this fantastic addon!
}

export type OptionValueType = Partial<Options> | boolean;

declare global {
  namespace HyperMD {
    interface EditorConfiguration {
      /**
       * Options for MyAddon.
       *
       * You may also provide a `false` to disable it; a `true` to enable it with defaultOption (except `enabled`)
       */
      // TODO: write doc above
      hmdMyAddon?: OptionValueType
    }
  }
}

suggestedEditorConfig.hmdMyAddon = suggestedOption

CodeMirror.defineOption("hmdMyAddon", defaultOption, function (cm: cm_t, newVal: OptionValueType) {

  ///// convert newVal's type to `Partial<Options>`, if it is not.

  if (!newVal || typeof newVal === "boolean") {
    newVal = { enabled: !!newVal }
  }

  ///// apply config and write new values into cm

  var inst = getAddon(cm)
  for (var k in defaultOption) {
    inst[k] = (k in newVal) ? newVal[k] : defaultOption[k]
  }
})

//#endregion

/********************************************************************************** */
//#region Addon Class

export class MyAddon implements Addon.Addon, Options /* if needed */ {
  enabled: boolean;

  constructor(public cm: cm_t) {
    // options will be initialized to defaultOption when constructor is finished
    // add your code here

    new FlipFlop() // use FlipFlop to detect if a option is changed
      .bind(this, "enabled", true) // <- `true` means `this.enabled` is always a boolean
      .ON(() => {/*  enable MyAddon here, add event listeners,etc. */ })
      .OFF(() => {/* disable MyAddon here, remove event listeners  */ })
  }
}

//#endregion

/** ADDON GETTER (Singleton Pattern): a editor can have only one MyAddon instance */
export const getAddon = Addon.Getter("MyAddon", MyAddon, defaultOption /** if has options */)
declare global { namespace HyperMD { interface HelperCollection { MyAddon?: MyAddon } } }
