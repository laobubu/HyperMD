import * as CodeMirror from 'codemirror';
import { Addon } from '../core';
import { TextMarker, Position } from 'codemirror';
import { cm_t } from '../core/type';
import { FolderFunc } from './fold';
/********************************************************************************** */
export declare type MathRenderMode = "display" | "";
export declare abstract class MathRenderer {
    constructor(container: HTMLElement, mode: MathRenderMode);
    startRender(expr: string): void;
    clear(): void;
    /** a callback function, called when a rendering work is done */
    onChanged: (expr: string) => void;
    /** indicate that if the Renderer is ready to execute */
    isReady(): boolean;
}
/********************************************************************************** */
/**
 * Detect if a token is a beginning of Math, and fold it!
 *
 * @see FolderFunc in ./fold.ts
 */
export declare const MathFolder: FolderFunc;
/**
 * Insert a TextMarker, and try to render it with configured MathRenderer.
 */
export declare function insertMathMark(cm: cm_t, p1: Position, p2: Position, expression: string, tokenLength: number, isDisplayMode?: boolean): TextMarker;
/********************************************************************************** */
export declare class DumbRenderer implements MathRenderer {
    container: HTMLElement;
    img: HTMLImageElement;
    last_expr: string;
    constructor(container: HTMLElement, mode: MathRenderMode);
    startRender(expr: string): void;
    clear(): void;
    /** a callback function, called when a rendering work is done */
    onChanged: (expr: string) => void;
    /** indicate that if the Renderer is ready to execute */
    isReady(): boolean;
}
/********************************************************************************** */
export interface Options extends Addon.AddonOptions {
    /**
     * custom renderer
     *
     * @see MathRenderer
     * @see DumbRenderer
     */
    renderer: typeof MathRenderer;
    /** a callback whenever you shall show/update a math preview */
    onPreview: (expr: string) => void;
    /** a callback whenever you shall hide the preview box */
    onPreviewEnd: () => void;
}
export declare const defaultOption: Options;
export declare const suggestedOption: Partial<Options>;
export declare type OptionValueType = Partial<Options> | (typeof MathRenderer);
declare global {
    namespace HyperMD {
        interface EditorConfiguration {
            /**
             * Options for FoldMath.
             *
             * **NOTE**: to switch this feature off, please modify `hmdFold.math` instead.
             *
             * You may also provide a MathRenderer class constructor
             *
             * @see MathRenderer
             */
            hmdFoldMath?: OptionValueType;
        }
    }
}
/********************************************************************************** */
export declare class FoldMath implements Addon.Addon, Options {
    cm: cm_t;
    renderer: typeof MathRenderer;
    onPreview: (expr: string) => void;
    onPreviewEnd: () => void;
    /** current previewing TeX expression. could be null */
    editingExpr: string;
    constructor(cm: cm_t);
    createRenderer(container: HTMLElement, mode: MathRenderMode): MathRenderer;
}
/** ADDON GETTER (Singleton Pattern): a editor can have only one FoldMath instance */
export declare const getAddon: (cm: CodeMirror.Editor) => FoldMath;
declare global {
    namespace HyperMD {
        interface HelperCollection {
            FoldMath?: FoldMath;
        }
    }
}
