
(function (mod){ //[HyperMD] UMD patched!
  /*commonjs*/  ("object"==typeof exports&&"undefined"!=typeof module) ? mod(null, exports, require("./utils")) :
  /*amd*/       ("function"==typeof define&&define.amd) ? define(["require","exports","./utils"], mod) :
  /*plain env*/ mod(null, (this.HyperMD = this.HyperMD || {}), HyperMD);
})(function (require, exports, utils_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * Post-process CodeMirror-mode-parsed lines, find the ranges
     *
     * for example, a parsed line `[**Hello** World](xxx.txt)` will gives you:
     *
     * 1. link from `[` to `)`
     * 2. bold text from `**` to another `**`
     */
    var LineSpanExtractor = /** @class */ (function () {
        function LineSpanExtractor(cm) {
            var _this = this;
            this.cm = cm;
            this.caches = new Array(); // cache for each lines
            cm.on("change", function (cm, change) {
                var line = change.from.line;
                if (_this.caches.length > line)
                    _this.caches.splice(line);
            });
        }
        LineSpanExtractor.prototype.getTokenTypes = function (token, prevToken) {
            var prevState = prevToken ? prevToken.state : {};
            var state = token.state;
            var styles = ' ' + token.type + ' ';
            var ans = {
                // em
                em: (state.em ? 1 /* IS_THIS_TYPE */
                    : prevState.em ? 2 /* LEAVING_THIS_TYPE */ : 0 /* NOTHING */),
                // strikethrough
                strikethrough: (state.strikethrough ? 1 /* IS_THIS_TYPE */
                    : prevState.strikethrough ? 2 /* LEAVING_THIS_TYPE */ : 0 /* NOTHING */),
                // strong
                strong: (state.strong ? 1 /* IS_THIS_TYPE */
                    : prevState.strong ? 2 /* LEAVING_THIS_TYPE */ : 0 /* NOTHING */),
                // code
                code: (state.code ? 1 /* IS_THIS_TYPE */
                    : prevState.code ? 2 /* LEAVING_THIS_TYPE */ : 0 /* NOTHING */),
                // linkText
                linkText: (state.linkText ?
                    (state.hmdLinkType === 3 /* NORMAL */ || state.hmdLinkType === 6 /* BARELINK2 */ ? 1 /* IS_THIS_TYPE */ : 0 /* NOTHING */) :
                    (prevState.linkText ? 2 /* LEAVING_THIS_TYPE */ : 0 /* NOTHING */)),
                // linkHref
                linkHref: ((state.linkHref && !state.linkText) ?
                    1 /* IS_THIS_TYPE */ :
                    (!state.linkHref && !state.linkText && prevState.linkHref && !prevState.linkText) ? 2 /* LEAVING_THIS_TYPE */ : 0 /* NOTHING */),
                // task checkbox
                task: (styles.indexOf(' formatting-task ') !== -1)
                    ? (1 /* IS_THIS_TYPE */ | 2 /* LEAVING_THIS_TYPE */)
                    : (0 /* NOTHING */),
                // hashtag
                hashtag: (state.hmdHashtag ? 1 /* IS_THIS_TYPE */ :
                    prevState.hmdHashtag ? 2 /* LEAVING_THIS_TYPE */ : 0 /* NOTHING */),
            };
            return ans;
        };
        /** get spans from a line and update the cache */
        LineSpanExtractor.prototype.extract = function (lineNo, precise) {
            if (!precise) { // maybe cache is valid?
                var cc = this.caches[lineNo];
                if (cc)
                    return cc;
            }
            var tokens = this.cm.getLineTokens(lineNo);
            var lineText = this.cm.getLine(lineNo);
            var lineLength = lineText.length;
            var ans = [];
            var unclosed = {};
            for (var i = 0; i < tokens.length; i++) {
                var token = tokens[i];
                var types = this.getTokenTypes(token, tokens[i - 1]);
                for (var type in types) {
                    var span = unclosed[type];
                    if (types[type] & 1 /* IS_THIS_TYPE */) { // style is active
                        if (!span) { // create a new span if needed
                            span = {
                                type: type,
                                begin: token.start,
                                end: lineLength,
                                head: token,
                                head_i: i,
                                tail: tokens[tokens.length - 1],
                                tail_i: tokens.length - 1,
                                text: lineText.slice(token.start),
                            };
                            ans.push(span);
                            unclosed[type] = span;
                        }
                    }
                    if (types[type] & 2 /* LEAVING_THIS_TYPE */) { // a style is exiting
                        if (span) { // close an unclosed span
                            span.tail = token;
                            span.tail_i = i;
                            span.end = token.end;
                            span.text = span.text.slice(0, span.end - span.begin);
                            unclosed[type] = null;
                        }
                    }
                }
            }
            this.caches[lineNo] = ans;
            return ans;
        };
        LineSpanExtractor.prototype.findSpansAt = function (pos) {
            var spans = this.extract(pos.line);
            var ch = pos.ch;
            var ans = [];
            for (var i = 0; i < spans.length; i++) {
                var span = spans[i];
                if (span.begin > ch)
                    break;
                if (ch >= span.begin && span.end >= ch)
                    ans.push(span);
            }
            return ans;
        };
        LineSpanExtractor.prototype.findSpanWithTypeAt = function (pos, type) {
            var spans = this.extract(pos.line);
            var ch = pos.ch;
            for (var i = 0; i < spans.length; i++) {
                var span = spans[i];
                if (span.begin > ch)
                    break;
                if (ch >= span.begin && span.end >= ch && span.type === type)
                    return span;
            }
            return null;
        };
        return LineSpanExtractor;
    }());
    var extractor_symbol = utils_1.makeSymbol("LineSpanExtractor");
    /**
     * Get a `LineSpanExtractor` to extract spans from CodeMirror parsed lines
     *
     * for example, a parsed line `[**Hello** World](xxx.txt)` will gives you:
     *
     * 1. link from `[` to `)`
     * 2. bold text from `**` to another `**`
     */
    function getLineSpanExtractor(cm) {
        if (extractor_symbol in cm)
            return cm[extractor_symbol];
        var inst = cm[extractor_symbol] = new LineSpanExtractor(cm);
        return inst;
    }
    exports.getLineSpanExtractor = getLineSpanExtractor;
});
