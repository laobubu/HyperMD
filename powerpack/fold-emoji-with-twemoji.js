// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
//
// POWERPACK for "addon/fold-emoji"
//
// Use [twemoji](https://github.com/twitter/twemoji) to render emoji `:smile:` :smile:
//
// :warning: **License**:
//
// Please follow https://github.com/twitter/twemoji#license if you use this powerpack.
// 使用前请注意阅读 twemoji 使用许可
//

(function (mod){ //[HyperMD] UMD patched!
  /*commonjs*/  ("object"==typeof exports&&"undefined"!=typeof module) ? mod(null, exports, require("twemoji"), require("../addon/fold-emoji")) :
  /*amd*/       ("function"==typeof define&&define.amd) ? define(["require","exports","twemoji","../addon/fold-emoji"], mod) :
  /*plain env*/ mod(null, (this.HyperMD_PowerPack = this.HyperMD_PowerPack || {}, this.HyperMD_PowerPack["fold-emoji-with-twemoji"] = {}), twemoji, HyperMD.FoldEmoji);
})(function (require, exports, _twemoji_module, fold_emoji_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /** twemoji */
    var twemoji = _twemoji_module || this['twemoji'] || window['twemoji'];
    var twemojiOptions = null;
    /** set the 2nd argument of `twemoji.parse()` */
    function setOptions(options) {
        twemojiOptions = options;
    }
    exports.setOptions = setOptions;
    exports.twemojiChecker = fold_emoji_1.defaultChecker;
    exports.twemojiRenderer = function (text) {
        var emojiStr = fold_emoji_1.defaultDict[text];
        var html = twemojiOptions ? twemoji.parse(emojiStr, twemojiOptions) : twemoji.parse(emojiStr);
        // If twemoji failed to render, fallback to defaultRenderer
        if (!/^<img /i.test(html))
            return fold_emoji_1.defaultRenderer(text);
        var attr = /([\w-]+)="(.+?)"/g;
        var ans = document.createElement("img");
        var t;
        while (t = attr.exec(html))
            ans.setAttribute(t[1], t[2]);
        return ans;
    };
    // Update default EmojiChecker and EmojiRenderer
    if (twemoji) {
        fold_emoji_1.defaultOption.emojiChecker = exports.twemojiChecker;
        fold_emoji_1.defaultOption.emojiRenderer = exports.twemojiRenderer;
    }
    else {
        console.error("[HyperMD] PowerPack fold-emoji-with-twemoji loaded, but twemoji not found.");
    }
});
