/**
 * CodeMirror-related utils
 *
 * @internal Part of HyperMD core.
 *
 * You shall NOT import this file; please import "core" instead
 */

(function (mod){ //[HyperMD] UMD patched!
  /*commonjs*/  ("object"==typeof exports&&"undefined"!=typeof module) ? mod(null, exports, require("./cm_internal"), require("codemirror")) :
  /*amd*/       ("function"==typeof define&&define.amd) ? define(["require","exports","./cm_internal","codemirror"], mod) :
  /*plain env*/ mod(null, (this.HyperMD = this.HyperMD || {}), HyperMD, CodeMirror);
})(function (require, exports, cm_internal, codemirror_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.cm_internal = cm_internal;
    exports.cmpPos = codemirror_1.cmpPos;
    /**
     * Useful tool to seek for tokens
     *
     *     var seeker = new TokenSeeker(cm)
     *     seeker.setPos(0, 0) // set to line 0, char 0
     *     var ans = seeker.findNext(/fomratting-em/)
     *
     */
    var TokenSeeker = /** @class */ (function () {
        function TokenSeeker(cm) {
            this.cm = cm;
        }
        TokenSeeker.prototype.findNext = function (condition, varg, since) {
            var lineNo = this.lineNo;
            var tokens = this.lineTokens;
            var token = null;
            var i_token = this.i_token + 1;
            var maySpanLines = false;
            if (varg === true) {
                maySpanLines = true;
            }
            else if (typeof varg === 'number') {
                i_token = varg;
            }
            if (since) {
                if (since.line > lineNo) {
                    i_token = tokens.length; // just ignore current line
                }
                else if (since.line < lineNo) {
                    // hmmm... we shall NEVER go back
                }
                else {
                    for (; i_token < tokens.length; i_token++) {
                        if (tokens[i_token].start >= since.ch)
                            break;
                    }
                }
            }
            for (; i_token < tokens.length; i_token++) {
                var token_tmp = tokens[i_token];
                if ((typeof condition === "function") ? condition(token_tmp, tokens, i_token) : condition.test(token_tmp.type)) {
                    token = token_tmp;
                    break;
                }
            }
            if (!token && maySpanLines) {
                var cm_1 = this.cm;
                var startLine = Math.max(since ? since.line : 0, lineNo + 1);
                cm_1.eachLine(startLine, cm_1.lastLine() + 1, function (line_i) {
                    lineNo = line_i.lineNo();
                    tokens = cm_1.getLineTokens(lineNo);
                    i_token = 0;
                    if (since && lineNo === since.line) {
                        for (; i_token < tokens.length; i_token++) {
                            if (tokens[i_token].start >= since.ch)
                                break;
                        }
                    }
                    for (; i_token < tokens.length; i_token++) {
                        var token_tmp = tokens[i_token];
                        if ((typeof condition === "function") ? condition(token_tmp, tokens, i_token) : condition.test(token_tmp.type)) {
                            token = token_tmp;
                            return true; // stop `eachLine`
                        }
                    }
                });
            }
            return token ? { lineNo: lineNo, token: token, i_token: i_token } : null;
        };
        TokenSeeker.prototype.findPrev = function (condition, varg, since) {
            var lineNo = this.lineNo;
            var tokens = this.lineTokens;
            var token = null;
            var i_token = this.i_token - 1;
            var maySpanLines = false;
            if (varg === true) {
                maySpanLines = true;
            }
            else if (typeof varg === 'number') {
                i_token = varg;
            }
            if (since) {
                if (since.line < lineNo) {
                    i_token = -1; // just ignore current line
                }
                else if (since.line > lineNo) {
                    // hmmm... we shall NEVER go forward
                }
                else {
                    for (; i_token < tokens.length; i_token++) {
                        if (tokens[i_token].start >= since.ch)
                            break;
                    }
                }
            }
            if (i_token >= tokens.length)
                i_token = tokens.length - 1;
            for (; i_token >= 0; i_token--) {
                var token_tmp = tokens[i_token];
                if ((typeof condition === "function") ? condition(token_tmp, tokens, i_token) : condition.test(token_tmp.type)) {
                    token = token_tmp;
                    break;
                }
            }
            if (!token && maySpanLines) {
                var cm = this.cm;
                var startLine = Math.min(since ? since.line : cm.lastLine(), lineNo - 1);
                var endLine = cm.firstLine();
                // cm.eachLine doesn't support reversed searching
                // use while... loop to iterate
                lineNo = startLine + 1;
                while (!token && endLine <= --lineNo) {
                    var line_i = cm.getLineHandle(lineNo);
                    tokens = cm.getLineTokens(lineNo);
                    i_token = 0;
                    if (since && lineNo === since.line) {
                        for (; i_token < tokens.length; i_token++) {
                            if (tokens[i_token].start >= since.ch)
                                break;
                        }
                    }
                    if (i_token >= tokens.length)
                        i_token = tokens.length - 1;
                    for (; i_token >= 0; i_token--) {
                        var token_tmp = tokens[i_token];
                        if ((typeof condition === "function") ? condition(token_tmp, tokens, i_token) : condition.test(token_tmp.type)) {
                            token = token_tmp;
                            break; // FOUND token !
                        }
                    }
                }
            }
            return token ? { lineNo: lineNo, token: token, i_token: i_token } : null;
        };
        /**
         * return a range in which every token has the same style, or meet same condition
         */
        TokenSeeker.prototype.expandRange = function (style, maySpanLines) {
            var cm = this.cm;
            var isStyled;
            if (typeof style === "function") {
                isStyled = style;
            }
            else {
                if (typeof style === "string")
                    style = new RegExp("(?:^|\\s)" + style + "(?:\\s|$)");
                isStyled = function (token) { return (token ? style.test(token.type || "") : false); };
            }
            var from = {
                lineNo: this.lineNo,
                i_token: this.i_token,
                token: this.lineTokens[this.i_token]
            };
            var to = Object.assign({}, from);
            // find left
            var foundUnstyled = false, tokens = this.lineTokens, i = this.i_token;
            while (!foundUnstyled) {
                if (i >= tokens.length)
                    i = tokens.length - 1;
                for (; i >= 0; i--) {
                    var token = tokens[i];
                    if (!isStyled(token, tokens, i)) {
                        foundUnstyled = true;
                        break;
                    }
                    else {
                        from.i_token = i;
                        from.token = token;
                    }
                }
                if (foundUnstyled || !(maySpanLines && from.lineNo > cm.firstLine()))
                    break; // found, or no more lines
                tokens = cm.getLineTokens(--from.lineNo);
                i = tokens.length - 1;
            }
            // find right
            var foundUnstyled = false, tokens = this.lineTokens, i = this.i_token;
            while (!foundUnstyled) {
                if (i < 0)
                    i = 0;
                for (; i < tokens.length; i++) {
                    var token = tokens[i];
                    if (!isStyled(token, tokens, i)) {
                        foundUnstyled = true;
                        break;
                    }
                    else {
                        to.i_token = i;
                        to.token = token;
                    }
                }
                if (foundUnstyled || !(maySpanLines && to.lineNo < cm.lastLine()))
                    break; // found, or no more lines
                tokens = cm.getLineTokens(++to.lineNo);
                i = 0;
            }
            return { from: from, to: to };
        };
        TokenSeeker.prototype.setPos = function (line, ch, precise) {
            if (ch === void 0) {
                ch = line;
                line = this.line;
            }
            else if (typeof line === 'number')
                line = this.cm.getLineHandle(line);
            var sameLine = line === this.line;
            var i_token = 0;
            if (precise || !sameLine) {
                this.line = line;
                this.lineNo = line.lineNo();
                this.lineTokens = this.cm.getLineTokens(this.lineNo);
            }
            else {
                // try to speed-up seeking
                i_token = this.i_token;
                var token = this.lineTokens[i_token];
                if (token.start > ch)
                    i_token = 0;
            }
            var tokens = this.lineTokens;
            for (; i_token < tokens.length; i_token++) {
                if (tokens[i_token].end > ch)
                    break; // found
            }
            this.i_token = i_token;
        };
        /** get (current or idx-th) token */
        TokenSeeker.prototype.getToken = function (idx) {
            if (typeof idx !== 'number')
                idx = this.i_token;
            return this.lineTokens[idx];
        };
        /** get (current or idx-th) token type. always return a string */
        TokenSeeker.prototype.getTokenType = function (idx) {
            if (typeof idx !== 'number')
                idx = this.i_token;
            var t = this.lineTokens[idx];
            return t && t.type || "";
        };
        return TokenSeeker;
    }());
    exports.TokenSeeker = TokenSeeker;
    /**
     * CodeMirror's `getLineTokens` might merge adjacent chars with same styles,
     * but this one won't.
     *
     * This one will consume more memory.
     *
     * @param {CodeMirror.LineHandle} line
     * @returns {string[]} every char's style
     */
    function getEveryCharToken(line) {
        var ans = new Array(line.text.length);
        var ss = line.styles;
        var i = 0;
        if (ss) {
            // CodeMirror already parsed this line. Use cache
            for (var j = 1; j < ss.length; j += 2) {
                var i_to = ss[j], s = ss[j + 1];
                while (i < i_to)
                    ans[i++] = s;
            }
        }
        else {
            // Emmm... slow method
            var cm = line.parent.cm || line.parent.parent.cm || line.parent.parent.parent.cm;
            var ss_1 = cm.getLineTokens(line.lineNo());
            for (var j = 0; j < ss_1.length; j++) {
                var i_to = ss_1[j].end, s = ss_1[j].type;
                while (i < i_to)
                    ans[i++] = s;
            }
        }
        return ans;
    }
    exports.getEveryCharToken = getEveryCharToken;
    /**
     * return a range in which every char has the given style (aka. token type).
     * assuming char at `pos` already has the style.
     *
     * the result will NOT span lines.
     *
     * @param style aka. token type
     * @see TokenSeeker if you want to span lines
     */
    function expandRange(cm, pos, style) {
        var line = pos.line;
        var from = { line: line, ch: 0 };
        var to = { line: line, ch: pos.ch };
        var styleFn = typeof style === "function" ? style : false;
        var styleRE = (!styleFn) && new RegExp("(?:^|\\s)" + style + "(?:\\s|$)");
        var tokens = cm.getLineTokens(line);
        var iSince;
        for (iSince = 0; iSince < tokens.length; iSince++) {
            if (tokens[iSince].end >= pos.ch)
                break;
        }
        if (iSince === tokens.length)
            return null;
        for (var i = iSince; i < tokens.length; i++) {
            var token = tokens[i];
            if (styleFn ? styleFn(token) : styleRE.test(token.type))
                to.ch = token.end;
            else
                break;
        }
        for (var i = iSince; i >= 0; i--) {
            var token = tokens[i];
            if (!(styleFn ? styleFn(token) : styleRE.test(token.type))) {
                from.ch = token.end;
                break;
            }
        }
        return { from: from, to: to };
    }
    exports.expandRange = expandRange;
    /**
     * Get ordered range from `CodeMirror.Range`-like object or `[Position, Position]`
     *
     * In an ordered range, The first `Position` must NOT be after the second.
     */
    function orderedRange(range) {
        if ('anchor' in range)
            range = [range.head, range.anchor];
        if (codemirror_1.cmpPos(range[0], range[1]) > 0)
            return [range[1], range[0]];
        else
            return [range[0], range[1]];
    }
    exports.orderedRange = orderedRange;
    /**
     * Check if two range has intersection.
     *
     * @param range1 ordered range 1  (start <= end)
     * @param range2 ordered range 2  (start <= end)
     */
    function rangesIntersect(range1, range2) {
        var from1 = range1[0], to1 = range1[1];
        var from2 = range2[0], to2 = range2[1];
        return !(codemirror_1.cmpPos(to1, from2) < 0 || codemirror_1.cmpPos(from1, to2) > 0);
    }
    exports.rangesIntersect = rangesIntersect;
});
