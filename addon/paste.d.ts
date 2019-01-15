import * as CodeMirror from 'codemirror';
import { Addon } from '../core';
import { cm_t } from '../core/type';
/********************************************************************************** */
export declare type PasteConvertor = (html: string) => string | void;
/********************************************************************************** */
export interface Options extends Addon.AddonOptions {
    /** Enable Paste feature or not. */
    enabled: boolean;
    /** a function which accepts HTML, returning markdown text. */
    convertor: PasteConvertor;
}
export declare const defaultOption: Options;
export declare const suggestedOption: Partial<Options>;
export declare type OptionValueType = Partial<Options> | boolean | PasteConvertor;
declare global {
    namespace HyperMD {
        interface EditorConfiguration {
            /**
             * Options for Paste.
             *
             * You may set a `PasteConvertor` function which accepts HTML, returning markdown text. Or set to `null` to disable this feature
             *
             * @see PasteConvertor
             */
            hmdPaste?: OptionValueType;
        }
    }
}
/********************************************************************************** */
export declare class Paste implements Addon.Addon, Options {
    cm: cm_t;
    enabled: boolean;
    convertor: PasteConvertor;
    constructor(cm: cm_t);
    private pasteHandler;
}
/** ADDON GETTER (Singleton Pattern): a editor can have only one Paste instance */
export declare const getAddon: (cm: CodeMirror.Editor) => Paste;
declare global {
    namespace HyperMD {
        interface HelperCollection {
            Paste?: Paste;
        }
    }
}
