import * as CodeMirror from 'codemirror';
import { Addon } from '../core';
import { cm_t } from '../core/type';
import 'codemirror/mode/meta';
declare global {
    const requirejs: (modules: string[], factory: Function) => any;
}
/** user may provider an async CodeMirror mode loader function */
export declare type LoaderFunc = (mode: string, successCb: Function, errorCb: Function) => void;
/********************************************************************************** */
export interface Options extends Addon.AddonOptions {
    /**
     * providing a source of codemirror modes
     *
     * - (a `LoaderFunc` function)
     * - `"http://cdn.xxxxx.com/codemirror/v4.xx/"`
     * - `"./node_modules/codemirror/"`            <- relative to webpage's URL
     * - `"~codemirror/"`                          <- for requirejs
     */
    source: string | LoaderFunc;
}
export declare const defaultOption: Options;
export declare const suggestedOption: Partial<Options>;
export declare type OptionValueType = Partial<Options> | boolean | string | LoaderFunc;
declare global {
    namespace HyperMD {
        interface EditorConfiguration {
            /**
             * Options for ModeLoader.
             *
             * You may also provide:
             * - boolean: `true` will use suggested source
             * - `string` or `LoaderFunc` as the new source
             *
             * @see LoaderFunc
             */
            hmdModeLoader?: OptionValueType;
        }
    }
}
/********************************************************************************** */
export declare class ModeLoader implements Addon.Addon, Options {
    cm: cm_t;
    source: string | LoaderFunc;
    constructor(cm: cm_t);
    /** trig a "change" event on one line */
    touchLine(lineNo: number): void;
    private _loadingModes;
    /**
     * load a mode, then refresh editor
     *
     * @param  mode
     * @param  line >=0 : add into waiting queue    <0 : load and retry up to `-line` times
     */
    startLoadMode(mode: string, line: number): void;
    /**
     * CodeMirror "renderLine" event handler
     */
    private rlHandler;
}
/** ADDON GETTER (Singleton Pattern): a editor can have only one ModeLoader instance */
export declare const getAddon: (cm: CodeMirror.Editor) => ModeLoader;
declare global {
    namespace HyperMD {
        interface HelperCollection {
            ModeLoader?: ModeLoader;
        }
    }
}
