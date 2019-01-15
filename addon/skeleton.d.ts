import * as CodeMirror from 'codemirror';
import { Addon } from '../core';
import { cm_t } from '../core/type';
/********************************************************************************** */
export declare const Extensions: {
    hmdRollAndDice(this: CodeMirror.Editor, foo: string, bar: string): number;
};
export declare type ExtensionsType = typeof Extensions;
declare global {
    namespace HyperMD {
        interface Editor extends ExtensionsType {
        }
    }
}
/********************************************************************************** */
export interface Options extends Addon.AddonOptions {
    /** Enable MyAddon features or not. */ enabled: boolean;
}
export declare const defaultOption: Options;
export declare const suggestedOption: Partial<Options>;
export declare type OptionValueType = Partial<Options> | boolean;
declare global {
    namespace HyperMD {
        interface EditorConfiguration {
            /**
             * Options for MyAddon.
             *
             * You may also provide a `false` to disable it; a `true` to enable it with defaultOption (except `enabled`)
             */
            hmdMyAddon?: OptionValueType;
        }
    }
}
/********************************************************************************** */
export declare class MyAddon implements Addon.Addon, Options {
    cm: cm_t;
    enabled: boolean;
    constructor(cm: cm_t);
}
/** ADDON GETTER (Singleton Pattern): a editor can have only one MyAddon instance */
export declare const getAddon: (cm: CodeMirror.Editor) => MyAddon;
declare global {
    namespace HyperMD {
        interface HelperCollection {
            MyAddon?: MyAddon;
        }
    }
}
