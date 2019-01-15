import * as CodeMirror from 'codemirror';
import { Addon } from '../core';
import { cm_t } from '../core/type';
/********************************************************************************** */
export interface Options extends Addon.AddonOptions {
    /** Enable TableAlign */
    enabled: boolean;
}
export declare const defaultOption: Options;
export declare const suggestedOption: Partial<Options>;
export declare type OptionValueType = Partial<Options> | boolean;
declare global {
    namespace HyperMD {
        interface EditorConfiguration {
            /**
             * Options for TableAlign.
             *
             * You may also provide a boolean to toggle it.
             */
            hmdTableAlign?: OptionValueType;
        }
    }
}
/********************************************************************************** */
export declare class TableAlign implements Addon.Addon, Options {
    cm: cm_t;
    enabled: boolean;
    constructor(cm: cm_t);
    styleEl: HTMLStyleElement;
    private _lastCSS;
    /**
     * Remeasure visible columns, update CSS style to make columns aligned
     *
     * (This is a debounced function)
     */
    updateStyle: {
        (): void;
        stop(): void;
    };
    /** CodeMirror renderLine event handler */
    private _procLine;
    /**
     * create a <span> container as column,
     * note that put content into column.firstElementChild
     */
    makeColumn(index: number, style: string, tableID: string): HTMLSpanElement;
    /** Measure all visible tables and columns */
    measure(): {
        [tableID: string]: number[];
    };
    /** Generate CSS */
    makeCSS(measures: {
        [tableID: string]: number[];
    }): string;
}
/** ADDON GETTER (Singleton Pattern): a editor can have only one TableAlign instance */
export declare const getAddon: (cm: CodeMirror.Editor) => TableAlign;
declare global {
    namespace HyperMD {
        interface HelperCollection {
            TableAlign?: TableAlign;
        }
    }
}
