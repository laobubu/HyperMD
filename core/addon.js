/**
 * Utils for HyperMD addons
 *
 * @internal Part of HyperMD core.
 *
 * You shall NOT import this file; please import "core" instead
 */

(function (mod){ //[HyperMD] UMD patched!
  /*commonjs*/  ("object"==typeof exports&&"undefined"!=typeof module) ? mod(null, exports, ) :
  /*amd*/       ("function"==typeof define&&define.amd) ? define(["require","exports"], mod) :
  /*plain env*/ mod(null, (this.HyperMD = this.HyperMD || {}), );
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var Addon = /** @class */ (function () {
        function Addon(cm) {
        }
        return Addon;
    }());
    exports.Addon = Addon;
    /** make a Singleton getter */
    function Getter(name, ClassCtor, defaultOption) {
        return function (cm) {
            if (!cm.hmd)
                cm.hmd = {};
            if (!cm.hmd[name]) {
                var inst = new ClassCtor(cm);
                cm.hmd[name] = inst;
                if (defaultOption) {
                    for (var k in defaultOption)
                        inst[k] = defaultOption[k];
                }
                return inst;
            }
            return cm.hmd[name];
        };
    }
    exports.Getter = Getter;
});
