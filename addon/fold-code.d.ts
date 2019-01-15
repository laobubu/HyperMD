import * as CodeMirror from 'codemirror';
import { Addon } from '../core';
import { cm_t } from '../core/type';
import { FolderFunc, FoldStream } from './fold';
/**
 * FoldInfo is the bridge between your rendered element and HyperMD editor.
 */
export interface FoldInfo {
    /** the languange name after leading triple-backtick in Markdown */
    readonly lang: string;
    readonly editor: cm_t;
    readonly marker: CodeMirror.TextMarker;
    readonly lineWidget: CodeMirror.LineWidget;
    /** CodeRenderer returned element */
    readonly el: HTMLElement;
    /** call this if you want to remove rendered result, and move cursor into the code block */
    readonly break: () => void;
    /** if rendererd element's dimension changed, call this! */
    readonly changed: () => void;
    /** called when this element is removed */
    onRemove?: (info: FoldInfo) => void;
    /** (not implemented) */
    onUpdate?: (newCode: string, info: FoldInfo) => void;
}
/**
 * A CodeRenderer turns code into flow chart / playground sandbox etc,
 * returning the rendered HTML element.
 *
 * 1. the CodeRenderer can set `info.onRemove` and `info.onUpdate` callbacks
 * 2. if rendered element's dimension is changed, you must call `info.changed()`
 * 3. do NOT use destructuring assignment with `info` !!!
 */
export declare type CodeRenderer = (code: string, info: FoldInfo) => HTMLElement;
export interface RegistryItem {
    name: string;
    /** enable this CodeRenderer by default */
    suggested?: boolean;
    /** the languange name after leading triple-backtick in Markdown  */
    pattern: string | RegExp | ((language: string) => boolean);
    renderer: CodeRenderer;
}
export declare var rendererRegistry: Record<string, RegistryItem>;
/**
 * Add a CodeRenderer to the System CodeRenderer Registry
 *
 * @param lang
 * @param folder
 * @param suggested enable this folder in suggestedEditorConfig
 * @param force if a folder with same name is already exists, overwrite it. (dangerous)
 */
export declare function registerRenderer(info: RegistryItem, force?: boolean): void;
/** the FolderFunc for Addon/Fold */
export declare const CodeFolder: FolderFunc;
/********************************************************************************** */
export declare type Options = Record<string, boolean>;
export declare const defaultOption: Options;
export declare const suggestedOption: Options;
export declare type OptionValueType = Options | boolean;
declare global {
    namespace HyperMD {
        interface EditorConfiguration {
            /**
             * Options for FoldCode.
             *
             * The flow charts / playground sandboxes from codeblocks, are rendered by CodeRenderer s.
             *
             * By default, `suggested` renderers will be enabled.
             * You can still choosed to enable/disable some of them via `hmdFoldCode` the editor option.
             *
             * **NOTE**: make sure `hmdFold.code` is `true`, otherwise, this option will not work.
             *
             * `hmdFoldCode` accepts 3 forms:
             *
             * 1. `true` -- only enable suggested renderers
             * 2. `false` -- disable all renderers
             * 3. `{ [RendererType]: boolean }` -- enable / disable CodeRenderer
             *    - Note: registered but not configured kinds will be disabled
             */
            hmdFoldCode?: OptionValueType;
        }
    }
}
/********************************************************************************** */
type FoldInfo_Master = {
    -readonly [P in keyof FoldInfo]: FoldInfo[P];
};
export declare class FoldCode implements Addon.Addon {
    cm: cm_t;
    /**
     * stores renderer status for current editor
     * @private To enable/disable renderer, use `setStatus()`
     */
    private _enabled;
    /** renderers' output goes here */
    folded: Record<string, FoldInfo_Master[]>;
    /** enable/disable one kind of renderer, in current editor */
    setStatus(type: string, enabled: boolean): void;
    /** Clear one type of rendered TextMarkers */
    clear(type: string): void;
    constructor(cm: cm_t);
    fold(stream: FoldStream, token: CodeMirror.Token): CodeMirror.TextMarker;
}
/** ADDON GETTER (Singleton Pattern): a editor can have only one FoldCode instance */
export declare const getAddon: (cm: CodeMirror.Editor) => FoldCode;
declare global {
    namespace HyperMD {
        interface HelperCollection {
            FoldCode?: FoldCode;
        }
    }
}
export {};
