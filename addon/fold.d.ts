import * as CodeMirror from 'codemirror';
import { Addon, TokenSeeker } from '../core';
import { Position, Token } from 'codemirror';
import { cm_t } from '../core/type';
export interface HmdTextMarker extends CodeMirror.TextMarker {
    /** @internal when caret in this range, break this marker */
    _hmd_crange?: [Position, Position];
    /** @internal the folder type of current marker */
    _hmd_fold_type?: string;
}
/********************************************************************************** */
/**
 * 1. Check if `token` is a **BEGINNING TOKEN** of fold-able text (eg. "!" for images)
 * 2. Use `stream.findNext` to find the end of the text to be folded (eg. ")" or "]" of link/URL, for images)
 * 3. Compose a range `{from, to}`
 *    - `from` is always `{ line: stream.lineNo, ch: token.start }`
 * 4. Check if `stream.requestRange(from, to[, cfrom, cto])` returns `RequestRangeResult.OK`
 *    - if not ok, you shall return `null` immediately.
 *    - the optional `cfrom` and `cto` compose a range, let's call it "crange".
 *      - If user's caret moves into that "crange", your marker will break automatically.
 *      - If "crange" is not provided, it will be the same as `[from, to]`
 *      - Note that "crange" can be bigger / smaller than the marker's range,
 *        as long as they have intersection.
 *      - In some cases, to prevent auto-breaking, please use `cfrom = from` and `cto = from`
 *        (and, yes, "crange" can be a zero-width range)
 * 5. Use `stream.cm.markText(from, to, options)` to fold text, and return the marker
 *
 * @param token current checking token. a shortcut to `stream.lineTokens[stream.i_token]`
 * @returns a TextMarker if folded.
 */
export declare type FolderFunc = (stream: FoldStream, token: CodeMirror.Token) => HmdTextMarker;
/** FolderFunc may use FoldStream to lookup for tokens */
export interface FoldStream {
    readonly cm: cm_t;
    readonly line: CodeMirror.LineHandle;
    readonly lineNo: number;
    readonly lineTokens: Token[];
    readonly i_token: number;
    /**
     * Find next Token that matches the condition AFTER current token (whose index is `i_token`), or a given position
     * This function will NOT make the stream precede!
     *
     * @param condition a RegExp to check token.type, or a function check the Token
     * @param maySpanLines by default the searching will not span lines
     */
    findNext(condition: TokenSeeker.ConditionType, maySpanLines?: boolean, since?: Position): TokenSeeker.ResultType;
    /**
     * In current line, find next Token that matches the condition SINCE the token with given index
     * This function will NOT make the stream precede!
     *
     * @param condition a RegExp to check token.type, or a function check the Token
     * @param i_token_since default: i_token+1 (the next of current token)
     */
    findNext(condition: TokenSeeker.ConditionType, i_token_since: number): TokenSeeker.ResultType;
    /**
     * Before creating a TextMarker, check if the range is good to use.
     *
     * Do NOT create TextMarker unless this returns `RequestRangeResult.OK`
     */
    requestRange(from: Position, to: Position): RequestRangeResult;
    /**
     * Before creating a TextMarker, check if the range is good to use.
     *
     * Do NOT create TextMarker unless this returns `RequestRangeResult.OK`
     *
     * @param cfrom if cfrom <= caret <= cto, the TextMarker will be removed.
     * @param cto   if cfrom <= caret <= cto, the TextMarker will be removed.
     */
    requestRange(from: Position, to: Position, cfrom: Position, cto: Position): RequestRangeResult;
}
export declare enum RequestRangeResult {
    OK = "ok",
    CURSOR_INSIDE = "ci",
    HAS_MARKERS = "hm"
}
/********************************************************************************** */
export declare var folderRegistry: Record<string, FolderFunc>;
/**
 * Add a Folder to the System Folder Registry
 *
 * @param name eg. "math"  "html"  "image"  "link"
 * @param folder
 * @param suggested enable this folder in suggestedEditorConfig
 * @param force if a folder with same name is already exists, overwrite it. (dangerous)
 */
export declare function registerFolder(name: string, folder: FolderFunc, suggested: boolean, force?: boolean): void;
/********************************************************************************** */
/** break a TextMarker, move cursor to where marker is */
export declare function breakMark(cm: cm_t, marker: HmdTextMarker, chOffset?: number): void;
/********************************************************************************** */
export declare type Options = Record<string, boolean>;
export declare const defaultOption: Options;
export declare const suggestedOption: Options;
export declare type OptionValueType = Options | boolean;
declare global {
    namespace HyperMD {
        interface EditorConfiguration {
            /**
             * Enable/disable registered folders, for current editor instance.
             *
             * `hmdFold` accepts:
             *
             * 1. `true` -- only enable suggested folders
             * 2. `false` -- disable all kinds of folders
             * 3. `{ [FolderType]: boolean }` -- enable / disable folders
             *    - Note: registered but not configured folder kinds will be disabled
             *
             * @example { image: true, link: true, math: true, html: false }
             */
            hmdFold?: OptionValueType;
        }
    }
}
/********************************************************************************** */
export declare class Fold extends TokenSeeker implements Addon.Addon, FoldStream {
    cm: cm_t;
    /**
     * stores Folder status for current editor
     * @private To enable/disable folders, use `setStatus()`
     */
    private _enabled;
    /** Folder's output goes here */
    folded: Record<string, HmdTextMarker[]>;
    /** enable/disable one kind of folder, in current editor */
    setStatus(type: string, enabled: boolean): void;
    constructor(cm: cm_t);
    /**
     * Check if a range is foldable and update _quickFoldHint
     *
     * NOTE: this function is always called after `_quickFoldHint` reset by `startFoldImmediately`
     */
    requestRange(from: Position, to: Position, cfrom?: Position, cto?: Position): RequestRangeResult;
    /**
     * Fold everything! (This is a debounced, and `this`-binded version)
     */
    startFold: {
        (): void;
        stop(): void;
    };
    /**
     * Fold everything!
     *
     * @param toLine last line to fold. Inclusive
     */
    startFoldImmediately(fromLine?: number, toLine?: number): void;
    /** stores every affected lineNo */
    private _quickFoldHint;
    private _lastCRange;
    /**
     * Start a quick fold: only process recent `requestRange`-failed ranges
     */
    startQuickFold(): void;
    /**
     * Clear one type of folded TextMarkers
     *
     * @param type builtin folder type ("image", "link" etc) or custom fold type
     */
    clear(type: string): void;
    /**
     * Clear all folding result
     */
    clearAll(): void;
}
/** ADDON GETTER (Singleton Pattern): a editor can have only one Fold instance */
export declare const getAddon: (cm: CodeMirror.Editor) => Fold;
declare global {
    namespace HyperMD {
        interface HelperCollection {
            Fold?: Fold;
        }
    }
}
