import * as CodeMirror from 'codemirror';
import { Addon } from '../core';
import { cm_t } from '../core/type';
/********************************************************************************** */
export interface Options extends Addon.AddonOptions {
    /** Enable CursorDebounce features or not. */
    enabled: boolean;
}
export declare const defaultOption: Options;
export declare const suggestedOption: Partial<Options>;
export declare type OptionValueType = Partial<Options> | boolean;
declare global {
    namespace HyperMD {
        interface EditorConfiguration {
            /**
             * Options for CursorDebounce.
             *
             * You may also provide a `false` to disable it; a `true` to enable it
             */
            hmdCursorDebounce?: OptionValueType;
        }
    }
}
/********************************************************************************** */
export declare class CursorDebounce implements Addon.Addon, Options {
    cm: cm_t;
    enabled: boolean;
    constructor(cm: cm_t);
    private lastX;
    private lastY;
    private lastTimeout;
    private mouseDownHandler;
    private mouseMoveSuppress;
}
/** ADDON GETTER (Singleton Pattern): a editor can have only one CursorDebounce instance */
export declare const getAddon: (cm: CodeMirror.Editor) => CursorDebounce;
declare global {
    namespace HyperMD {
        interface HelperCollection {
            CursorDebounce?: CursorDebounce;
        }
    }
}
