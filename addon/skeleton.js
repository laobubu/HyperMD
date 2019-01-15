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

(function (mod){ //[HyperMD] UMD patched!
  /*commonjs*/  ("object"==typeof exports&&"undefined"!=typeof module) ? mod(null, exports, require("codemirror"), require("../core")) :
  /*amd*/       ("function"==typeof define&&define.amd) ? define(["require","exports","codemirror","../core"], mod) :
  /*plain env*/ mod(null, {}, CodeMirror, HyperMD);
})(function (require, exports, CodeMirror, core_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /********************************************************************************** */
    //#region CodeMirror Extension
    // add methods to all CodeMirror editors
    // every codemirror editor will have these member methods:
    exports.Extensions = {
        hmdRollAndDice: function (foo, bar) {
            return 42;
        }
    };
    for (var name in exports.Extensions) {
        CodeMirror.defineExtension(name, exports.Extensions[name]);
    }
    exports.defaultOption = {
        enabled: false,
    };
    exports.suggestedOption = {
        enabled: true,
    };
    core_1.suggestedEditorConfig.hmdMyAddon = exports.suggestedOption;
    CodeMirror.defineOption("hmdMyAddon", exports.defaultOption, function (cm, newVal) {
        ///// convert newVal's type to `Partial<Options>`, if it is not.
        if (!newVal || typeof newVal === "boolean") {
            newVal = { enabled: !!newVal };
        }
        ///// apply config and write new values into cm
        var inst = exports.getAddon(cm);
        for (var k in exports.defaultOption) {
            inst[k] = (k in newVal) ? newVal[k] : exports.defaultOption[k];
        }
    });
    //#endregion
    /********************************************************************************** */
    //#region Addon Class
    var MyAddon = /** @class */ (function () {
        function MyAddon(cm) {
            // options will be initialized to defaultOption when constructor is finished
            // add your code here
            this.cm = cm;
            new core_1.FlipFlop() // use FlipFlop to detect if a option is changed
                .bind(this, "enabled", true) // <- `true` means `this.enabled` is always a boolean
                .ON(function () { })
                .OFF(function () { });
        }
        return MyAddon;
    }());
    exports.MyAddon = MyAddon;
    //#endregion
    /** ADDON GETTER (Singleton Pattern): a editor can have only one MyAddon instance */
    exports.getAddon = core_1.Addon.Getter("MyAddon", MyAddon, exports.defaultOption /** if has options */);
});
