import * as CodeMirror from 'codemirror';
import { Addon } from '../core';
import { cm_t } from '../core/type';
/********************************************************************************** */
export interface HandlerAction {
    setPlaceholder(placeholder: HTMLElement): any;
    /**
     * update Editor display and adapt to the placeholder's size
     *
     * Call this when placeholder is resized.
     */
    resize(): any;
    /**
     * remove placeholder and replace it with given text,
     * then move cursor to the front of `cursor`-th char (if `cursor` given).
     *
     * Call this when FileHandler's job is done (no matter success or fail)
     */
    finish(text: string, cursor?: number): any;
    marker: CodeMirror.TextMarker;
    cm: cm_t;
}
/**
 * File Handler is called when user is trying to insert file(s)
 *
 * returns `true` if files are accepted and uploading, and HyperMD will put a placeholder there.
 * Then FileHandler may use `action` object to change the placeholder and finish uploading.
 *
 * It's recommended (but not forced) to add "hmd-file-uploading" class to uploading item placeholders,
 * and "hmd-file-uploaded" to uploaded item placeholders.
 *
 * @see FileHandler
 * @see HandlerAction
 */
export declare type FileHandler = (files: FileList, action: HandlerAction) => boolean;
/**
 * send data to url
 *
 * @param method default: "POST"
 */
export declare function ajaxUpload(url: string, form: {
    [name: string]: string | File;
}, callback: (content: any, error: any) => void, method?: string): void;
/********************************************************************************** */
export interface Options extends Addon.AddonOptions {
    /** enable uploading from clipboard */
    byPaste: boolean;
    /** enable drag n drop uploading */
    byDrop: boolean;
    /**
     * handler function.
     *
     * returns `true` means files are accepted and uploading, and HyperMD will put a placeholder there.
     * Then FileHandler may use `action` object to change the placeholder and finish uploading.
     *
     * @see FileHandler
     * @see HandlerAction
     */
    fileHandler: FileHandler;
}
export declare const defaultOption: Options;
export declare const suggestedOption: Partial<Options>;
export declare type OptionValueType = Partial<Options> | boolean | FileHandler;
declare global {
    namespace HyperMD {
        interface EditorConfiguration {
            /**
             * Options for InsertFile.
             *
             * You may also provide a `false` to disable it; a `true` to enable it with `defaultOption.fileHandler`
             * ( Note: you shall load a related PowerPack, or manually, to populate `defaultOption.fileHandler` )
             *
             * Or provide a FileHandler (overwrite the default one), meanwhile, byDrop & byPaste will set to `true`
             */
            hmdInsertFile?: OptionValueType;
        }
    }
}
/********************************************************************************** */
export declare class InsertFile implements Addon.Addon, Options {
    cm: cm_t;
    byPaste: boolean;
    byDrop: boolean;
    fileHandler: FileHandler;
    constructor(cm: cm_t);
    /**
     * upload files to the current cursor.
     *
     * @param {DataTransfer} data
     * @returns {boolean} data is accepted or not
     */
    doInsert(data: DataTransfer, isClipboard?: boolean): boolean;
    private pasteHandle;
    private dropHandle;
}
/** ADDON GETTER (Singleton Pattern): a editor can have only one InsertFile instance */
export declare const getAddon: (cm: CodeMirror.Editor) => InsertFile;
declare global {
    namespace HyperMD {
        interface HelperCollection {
            InsertFile?: InsertFile;
        }
    }
}
