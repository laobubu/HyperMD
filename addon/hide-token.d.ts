import * as CodeMirror from 'codemirror';
import { Addon } from '../core';
import { cm_t } from '../core/type';
/********************************************************************************** */
export interface Options extends Addon.AddonOptions {
    /** Enable HideToken features or not. */
    enabled: boolean;
    /** Add `hmd-inactive-line` style to inactive lines or not */
    line: boolean;
    /** @internal reserved yet */
    tokenTypes: string[];
}
export declare const defaultOption: Options;
export declare const suggestedOption: Partial<Options>;
export declare type OptionValueType = Partial<Options> | boolean | string | string[];
declare global {
    namespace HyperMD {
        interface EditorConfiguration {
            /**
             * Options for HideToken.
             *
             * You may also provide a `false` to disable it; a `true` to enable it with defaultOption (except `enabled`);
             * or token types (as string array, or just a string with "|" as separator inside)
             */
            hmdHideToken?: OptionValueType;
        }
    }
}
export declare class HideToken implements Addon.Addon, Options {
    cm: cm_t;
    tokenTypes: string[];
    line: boolean;
    enabled: boolean;
    constructor(cm: cm_t);
    renderLineHandler: (cm: CodeMirror.Editor, line: CodeMirror.LineHandle, el: HTMLPreElement) => void;
    cursorActivityHandler: (doc: CodeMirror.Doc) => void;
    update: {
        (): void;
        stop(): void;
    };
    /**
     * hide/show <span>s in one line, based on `this._rangesInLine`
     * @returns line changed or not
     */
    procLine(line: CodeMirror.LineHandle | number, pre?: HTMLPreElement): boolean;
    /** Current user's selections, in each line */
    private _rangesInLine;
    updateImmediately(): void;
}
/** ADDON GETTER (Singleton Pattern): a editor can have only one HideToken instance */
export declare const getAddon: (cm: CodeMirror.Editor) => HideToken;
declare global {
    namespace HyperMD {
        interface HelperCollection {
            HideToken?: HideToken;
        }
    }
}
