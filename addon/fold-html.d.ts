import * as CodeMirror from 'codemirror';
import { Position } from 'codemirror';
import { Addon } from '../core';
import { cm_t } from '../core/type';
import { FolderFunc } from './fold';
import './read-link';
/********************************************************************************** */
/**
 * Before folding HTML, check its security and avoid XSS attack! Returns true if safe.
 */
export declare type CheckerFunc = (html: string, pos: Position, cm: cm_t) => boolean;
export declare var defaultChecker: CheckerFunc;
/********************************************************************************** */
/**
 * Something like `jQuery("<div>xxxx</div>")`, but serves for HyperMD's FoldHTML. You may returns `null` to stop folding.
 *
 * @param html only have one root element
 */
export declare type RendererFunc = (html: string, pos: Position, cm: cm_t) => HTMLElement;
/**
 * Create HTMLElement from HTML string and do special process with HyperMD.ReadLink
 */
export declare var defaultRenderer: RendererFunc;
/********************************************************************************** */
/**
 * Detect if a token is a beginning of HTML, and fold it!
 *
 * @see FolderFunc in ./fold.ts
 */
export declare const HTMLFolder: FolderFunc;
/********************************************************************************** */
export interface Options extends Addon.AddonOptions {
    /** Before folding HTML, check it to avoid XSS attack! Returns `true` if safe. */
    checker: CheckerFunc;
    /** A RendererFunc accepts HTML string (which has only one root node), renders it and returns the root element node */
    renderer: RendererFunc;
    /** There MUST be a stub icon after rendered HTML. You may decide its content. */
    stubText: string;
    /** If the rendered element's tagName matches this, user can NOT break it by clicking it */
    isolatedTagName: RegExp;
}
export declare const defaultOption: Options;
export declare const suggestedOption: Partial<Options>;
export declare type OptionValueType = Partial<Options> | CheckerFunc;
declare global {
    namespace HyperMD {
        interface EditorConfiguration {
            /**
             * Options for HTMLFolder
             *
             * **NOTE**: to switch this feature off, please modify `hmdFold.html` instead.
             *
             * You may provide a CheckerFunc to check if a HTML is safe to render.
             */
            hmdFoldHTML?: OptionValueType;
        }
    }
}
/********************************************************************************** */
export declare class FoldHTML implements Addon.Addon, Options {
    cm: cm_t;
    renderer: RendererFunc;
    isolatedTagName: RegExp;
    stubText: string;
    checker: CheckerFunc;
    constructor(cm: cm_t);
    /**
     * Render HTML, insert into editor and return the marker
     */
    renderAndInsert(html: string, from: CodeMirror.Position, to: CodeMirror.Position, inlineMode?: boolean): CodeMirror.TextMarker;
    makeStub(): HTMLSpanElement;
}
/** ADDON GETTER (Singleton Pattern): a editor can have only one FoldHTML instance */
export declare const getAddon: (cm: CodeMirror.Editor) => FoldHTML;
declare global {
    namespace HyperMD {
        interface HelperCollection {
            FoldHTML?: FoldHTML;
        }
    }
}
