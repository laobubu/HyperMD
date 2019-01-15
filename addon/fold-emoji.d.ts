import * as CodeMirror from 'codemirror';
import { Addon } from '../core';
import { cm_t } from '../core/type';
import { FolderFunc } from './fold';
/********************************************************************************** */
export declare type EmojiRenderer = (text: string) => HTMLElement;
export declare type EmojiChecker = (text: string) => boolean;
export declare const defaultDict: Record<string, string>;
export declare const defaultChecker: EmojiChecker;
export declare const defaultRenderer: EmojiRenderer;
/********************************************************************************** */
/**
 * Detect if a token is emoji and fold it
 *
 * @see FolderFunc in ./fold.ts
 */
export declare const EmojiFolder: FolderFunc;
/********************************************************************************** */
export interface Options extends Addon.AddonOptions {
    /**
     * you may add your custom emojis, which have higher priority than standard emojis
     *
     * @example { ":doge:": a_function_that_creates_doge_img_element }
     */
    myEmoji: {
        [name: string]: EmojiRenderer;
    };
    /**
     * Tired of plain text? You may provide a EmojiRenderer function,
     * which generates a HTML Element (eg. emoji image from twemoji or emojione)
     * for standard emojis.
     *
     * Note that if EmojiRenderer returns null, the folding process will be aborted.
     */
    emojiRenderer: EmojiRenderer;
    /**
     * Check if a emoji text , eg. `:smile:` , is valid
     */
    emojiChecker: EmojiChecker;
}
export declare const defaultOption: Options;
export declare const suggestedOption: Partial<Options>;
export declare type OptionValueType = Partial<Options>;
declare global {
    namespace HyperMD {
        interface EditorConfiguration {
            /**
             * **NOTE**: to stop folding emojis, please modify `hmdFold.emoji` instead.
             *
             * `hmdFoldEmoji` is options for EmojiFolder, which also accepts
             *
             * - **EmojiRenderer** function
             * - **string**: name of a emoji renderer (see emojiRenderer)
             */
            hmdFoldEmoji?: OptionValueType;
        }
    }
}
/********************************************************************************** */
export declare class FoldEmoji implements Addon.Addon, Options {
    cm: cm_t;
    myEmoji: {
        [name: string]: EmojiRenderer;
    };
    emojiRenderer: EmojiRenderer;
    emojiChecker: EmojiChecker;
    constructor(cm: cm_t);
    isEmoji(text: string): boolean;
    foldEmoji(text: string, from: CodeMirror.Position, to: CodeMirror.Position): CodeMirror.TextMarker;
}
/** ADDON GETTER (Singleton Pattern): a editor can have only one FoldEmoji instance */
export declare const getAddon: (cm: CodeMirror.Editor) => FoldEmoji;
declare global {
    namespace HyperMD {
        interface HelperCollection {
            FoldEmoji?: FoldEmoji;
        }
    }
}
