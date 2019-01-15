/**
 * Provides some universal utils
 *
 * @internal Part of HyperMD core.
 *
 * You shall NOT import this file; please import "core" instead
 */
import * as CodeMirror from "codemirror";
import './polyfill';
/** Simple FlipFlop */
export declare class FlipFlop<T = boolean> {
    private on_cb?;
    private off_cb?;
    state: T;
    private subkey;
    /**
     * Simple FlipFlop
     *
     * @param {function} on_cb see FlipFlop.ON(callback)
     * @param {function} off_cb see FlipFlop.OFF(callback)
     * @param {T} [state] initial state. default: false (boolean)
     * @param {string} [subkey] if get an object, use this key to retrive status. default: "enabled"
     */
    constructor(on_cb?: (s: T) => void, off_cb?: (s: T) => void, state?: T, subkey?: string);
    /** set a callback when state is changed and is **NOT** `null`, `false` etc. */
    ON(callback: (s: T) => void): this;
    /** set a callback when state is set to `null`, `false` etc. */
    OFF(callback: (s: T) => void): this;
    /**
     * Update FlipFlop status, and trig callback function if needed
     *
     * @param {T|object} state new status value. can be a object
     * @param {boolean} [toBool] convert retrived value to boolean. default: false
     */
    set(state: T | object, toBool?: boolean): void;
    setBool(state: boolean): void;
    /**
     * Bind to a object's property with `Object.defineProperty`
     * so that you may set state with `obj.enable = true`
     */
    bind<U>(obj: U, key: keyof U, toBool?: boolean): this;
}
/** async run a function, and retry up to N times until it returns true */
export declare function tryToRun(fn: () => boolean, times?: number, onFailed?: Function): void;
/**
 * make a debounced function
 *
 * @param {Function} fn
 * @param {number} delay in ms
 */
export declare function debounce(fn: Function, delay: number): {
    (): void;
    stop(): void;
};
/**
 * addClass / removeClass etc.
 *
 * using CodeMirror's (although they're legacy API)
 */
export declare const addClass: typeof CodeMirror.addClass;
export declare const rmClass: typeof CodeMirror.rmClass;
export declare const contains: typeof CodeMirror.contains;
/**
 * a fallback for new Array(count).fill(data)
 */
export declare function repeat<T>(item: T, count: number): T[];
export declare function repeatStr(item: string, count: number): string;
/**
 * Visit element nodes and their children
 */
export declare function visitElements(seeds: ArrayLike<HTMLElement>, handler: (el: HTMLElement) => void): void;
/**
 * A lazy and simple Element size watcher. NOT WORK with animations
 */
export declare function watchSize(el: HTMLElement, onChange: (newWidth: number, newHeight: number, oldWidth: number, oldHeight: number) => void, needPoll?: boolean): {
    check: {
        (): void;
        stop(): void;
    };
    stop: () => void;
};
export declare function makeSymbol(name: string): symbol | string;
