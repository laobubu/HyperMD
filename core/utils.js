/**
 * Provides some universal utils
 *
 * @internal Part of HyperMD core.
 *
 * You shall NOT import this file; please import "core" instead
 */

(function (mod){ //[HyperMD] UMD patched!
  /*commonjs*/  ("object"==typeof exports&&"undefined"!=typeof module) ? mod(null, exports, require("codemirror"), require("./polyfill")) :
  /*amd*/       ("function"==typeof define&&define.amd) ? define(["require","exports","codemirror","./polyfill"], mod) :
  /*plain env*/ mod(null, (this.HyperMD = this.HyperMD || {}), CodeMirror);
})(function (require, exports, CodeMirror) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /** Simple FlipFlop */
    var FlipFlop = /** @class */ (function () {
        /**
         * Simple FlipFlop
         *
         * @param {function} on_cb see FlipFlop.ON(callback)
         * @param {function} off_cb see FlipFlop.OFF(callback)
         * @param {T} [state] initial state. default: false (boolean)
         * @param {string} [subkey] if get an object, use this key to retrive status. default: "enabled"
         */
        function FlipFlop(on_cb, off_cb, state, subkey) {
            if (state === void 0) { state = false; }
            if (subkey === void 0) { subkey = "enabled"; }
            this.on_cb = on_cb;
            this.off_cb = off_cb;
            this.state = state;
            this.subkey = subkey;
        }
        /** set a callback when state is changed and is **NOT** `null`, `false` etc. */
        FlipFlop.prototype.ON = function (callback) { this.on_cb = callback; return this; };
        /** set a callback when state is set to `null`, `false` etc. */
        FlipFlop.prototype.OFF = function (callback) { this.off_cb = callback; return this; };
        /**
         * Update FlipFlop status, and trig callback function if needed
         *
         * @param {T|object} state new status value. can be a object
         * @param {boolean} [toBool] convert retrived value to boolean. default: false
         */
        FlipFlop.prototype.set = function (state, toBool) {
            var newVal = (typeof state === 'object' && state) ? state[this.subkey] : state;
            if (toBool)
                newVal = !!newVal;
            if (newVal === this.state)
                return;
            if (this.state = newVal) {
                this.on_cb && this.on_cb(newVal);
            }
            else {
                this.off_cb && this.off_cb(newVal);
            }
        };
        FlipFlop.prototype.setBool = function (state) {
            return this.set(state, true);
        };
        /**
         * Bind to a object's property with `Object.defineProperty`
         * so that you may set state with `obj.enable = true`
         */
        FlipFlop.prototype.bind = function (obj, key, toBool) {
            var _this = this;
            Object.defineProperty(obj, key, {
                get: function () { return _this.state; },
                set: function (v) { return _this.set(v, toBool); },
                configurable: true,
                enumerable: true,
            });
            return this;
        };
        return FlipFlop;
    }());
    exports.FlipFlop = FlipFlop;
    /** async run a function, and retry up to N times until it returns true */
    function tryToRun(fn, times, onFailed) {
        times = ~~times || 5;
        var delayTime = 250;
        function nextCycle() {
            if (!times--) {
                if (onFailed)
                    onFailed();
                return;
            }
            try {
                if (fn())
                    return;
            }
            catch (e) { }
            setTimeout(nextCycle, delayTime);
            delayTime *= 2;
        }
        setTimeout(nextCycle, 0);
    }
    exports.tryToRun = tryToRun;
    /**
     * make a debounced function
     *
     * @param {Function} fn
     * @param {number} delay in ms
     */
    function debounce(fn, delay) {
        var deferTask = null;
        var notClearBefore = 0;
        var run = function () { fn(); deferTask = 0; };
        var ans = function () {
            var nowTime = +new Date();
            if (deferTask) {
                if (nowTime < notClearBefore)
                    return;
                else
                    clearTimeout(deferTask);
            }
            deferTask = setTimeout(run, delay);
            notClearBefore = nowTime + 100; // allow 100ms error
        };
        ans.stop = function () {
            if (!deferTask)
                return;
            clearTimeout(deferTask);
            deferTask = 0;
        };
        return ans;
    }
    exports.debounce = debounce;
    /**
     * addClass / removeClass etc.
     *
     * using CodeMirror's (although they're legacy API)
     */
    exports.addClass = CodeMirror.addClass;
    exports.rmClass = CodeMirror.rmClass;
    exports.contains = CodeMirror.contains;
    /**
     * a fallback for new Array(count).fill(data)
     */
    function repeat(item, count) {
        var ans = new Array(count);
        if (ans['fill'])
            ans['fill'](item);
        else
            for (var i = 0; i < count; i++)
                ans[i] = item;
        return ans;
    }
    exports.repeat = repeat;
    function repeatStr(item, count) {
        var ans = "";
        while (count-- > 0)
            ans += item;
        return ans;
    }
    exports.repeatStr = repeatStr;
    /**
     * Visit element nodes and their children
     */
    function visitElements(seeds, handler) {
        var queue = [seeds], tmp;
        while (tmp = queue.shift()) {
            for (var i = 0; i < tmp.length; i++) {
                var el = tmp[i];
                if (!el || el.nodeType != Node.ELEMENT_NODE)
                    continue;
                handler(el);
                if (el.children && el.children.length > 0)
                    queue.push(el.children);
            }
        }
    }
    exports.visitElements = visitElements;
    /**
     * A lazy and simple Element size watcher. NOT WORK with animations
     */
    function watchSize(el, onChange, needPoll) {
        var _a = el.getBoundingClientRect(), width = _a.width, height = _a.height;
        /** check size and trig onChange */
        var check = debounce(function () {
            var rect = el.getBoundingClientRect();
            var newWidth = rect.width, newHeight = rect.height;
            if (width != newWidth || height != newHeight) {
                onChange(newWidth, newHeight, width, height);
                width = newWidth;
                height = newHeight;
                setTimeout(check, 200); // maybe changed again later?
            }
        }, 100);
        var nextTimer = null;
        function pollOnce() {
            if (nextTimer)
                clearTimeout(nextTimer);
            if (!stopped)
                nextTimer = setTimeout(pollOnce, 200);
            check();
        }
        var stopped = false;
        function stop() {
            stopped = true;
            check.stop();
            if (nextTimer) {
                clearTimeout(nextTimer);
                nextTimer = null;
            }
            for (var i = 0; i < eventBinded.length; i++) {
                eventBinded[i][0].removeEventListener(eventBinded[i][1], check, false);
            }
        }
        var eventBinded = [];
        function bindEvents(el) {
            var tagName = el.tagName;
            var computedStyle = getComputedStyle(el);
            var getStyle = function (name) { return (computedStyle.getPropertyValue(name) || ''); };
            if (getStyle("resize") != 'none')
                needPoll = true;
            // size changes if loaded
            if (/^(?:img|video)$/i.test(tagName)) {
                el.addEventListener('load', check, false);
                el.addEventListener('error', check, false);
            }
            else if (/^(?:details|summary)$/i.test(tagName)) {
                el.addEventListener('click', check, false);
            }
        }
        if (!needPoll)
            visitElements([el], bindEvents);
        // bindEvents will update `needPoll`
        if (needPoll)
            nextTimer = setTimeout(pollOnce, 200);
        return {
            check: check,
            stop: stop,
        };
    }
    exports.watchSize = watchSize;
    function makeSymbol(name) {
        if (typeof Symbol === 'function')
            return Symbol(name);
        return "_\n" + name + "\n_" + Math.floor(Math.random() * 0xFFFF).toString(16);
    }
    exports.makeSymbol = makeSymbol;
});
