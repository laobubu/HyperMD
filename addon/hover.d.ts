import * as CodeMirror from 'codemirror';
import { Addon } from '../core';
import './read-link';
import { cm_t } from '../core/type';
/********************************************************************************** */
/** convert footnote text into HTML. Note that `markdown` may be empty and you may return `null` to supress the tooltip */
export declare type Convertor = (footnote: string, markdown: string) => string;
/** if `marked` exists, use it; else, return safe html */
export declare function defaultConvertor(footnote: string, text: string): string;
/********************************************************************************** */
export interface Options extends Addon.AddonOptions {
    /** Enable Hover features or not. */ enabled: boolean;
    xOffset: number;
    /**
     * function to decide the tooltip's content.
     *
     * First parameter is the name of footnote (without square brackets),
     * and the second is footnote Markdown content (might be `null`, if not found).
     * This function shall returns HTML string or `null`.
     *
     * @see Convertor
     * @see defaultConvertor
     */
    convertor: Convertor;
}
export declare const defaultOption: Options;
export declare const suggestedOption: Partial<Options>;
export declare type OptionValueType = Partial<Options> | boolean | Convertor;
declare global {
    namespace HyperMD {
        interface EditorConfiguration {
            /**
             * Options for Hover.
             *
             * You may also provide a `false` to disable it;
             * a `true` to enable it with defaultOption (except `enabled`);
             * or a Convertor to decide the content of tooltip.
             *
             * @see Convertor
             */
            hmdHover?: OptionValueType;
        }
    }
}
/********************************************************************************** */
export declare class Hover implements Addon.Addon, Options {
    cm: cm_t;
    xOffset: number;
    convertor: Convertor;
    enabled: boolean;
    constructor(cm: cm_t);
    private lineDiv;
    tooltipDiv: HTMLDivElement;
    tooltipContentDiv: HTMLDivElement;
    tooltipIndicator: HTMLDivElement;
    mouseenter(ev: MouseEvent): void;
    showInfo(html: string, relatedTo: HTMLElement): void;
    hideInfo(): void;
}
/** ADDON GETTER (Singleton Pattern): a editor can have only one Hover instance */
export declare const getAddon: (cm: CodeMirror.Editor) => Hover;
declare global {
    namespace HyperMD {
        interface HelperCollection {
            Hover?: Hover;
        }
    }
}
