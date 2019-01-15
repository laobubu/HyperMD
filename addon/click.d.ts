import * as CodeMirror from 'codemirror';
import { Addon } from '../core';
import { cm_t } from '../core/type';
/********************************************************************************** */
export declare type TargetType = "image" | "link" | "footref" | "url" | "todo" | "hashtag";
export interface ClickInfo {
    type: TargetType;
    text: string;
    url: string;
    pos: CodeMirror.Position;
    button: number;
    clientX: number;
    clientY: number;
    ctrlKey: boolean;
    altKey: boolean;
    shiftKey: boolean;
}
/**
 * User may define his click handler, which has higher priority than HyperMD's.
 *
 * param `info` is a ClickInfo object, containing target type, text etc.
 *
 * Custom handler may return `false` to prevent HyperMD's default behavior.
 */
export declare type ClickHandler = (info: ClickInfo, cm: cm_t) => (false | void);
/********************************************************************************** */
export declare const defaultClickHandler: ClickHandler;
/********************************************************************************** */
export interface Options extends Addon.AddonOptions {
    /** Enable Click features or not. */
    enabled: boolean;
    /**
     * A callback when user clicked on something. May return `false` to supress HyperMD default behavoir.
     * @see ClickHandler
     */
    handler: ClickHandler;
}
export declare const defaultOption: Options;
export declare const suggestedOption: Partial<Options>;
export declare type OptionValueType = Partial<Options> | boolean | ClickHandler;
declare global {
    namespace HyperMD {
        interface EditorConfiguration {
            /**
             * Options for Click.
             *
             * You may also provide a `false` to disable it; a `true` to enable it with default behavior;
             * or a callback which may return `false` to supress HyperMD default behavoir.
             */
            hmdClick?: OptionValueType;
        }
    }
}
/********************************************************************************** */
export declare class Click implements Addon.Addon, Options {
    cm: cm_t;
    enabled: boolean;
    handler: ClickHandler;
    private el;
    constructor(cm: cm_t);
    /** CodeMirror's <pre>s container */
    private lineDiv;
    /** It's not  */
    private _KeyDetectorActive;
    /** remove modifier className to editor DOM */
    private _mouseMove_keyDetect;
    /** add modifier className to editor DOM */
    private _keyDown;
    /** last click info */
    private _cinfo;
    /**
     * Unbind _mouseUp, then call ClickHandler if mouse not bounce
     */
    private _mouseUp;
    /**
     * Try to construct ClickInfo and bind _mouseUp
     */
    private _mouseDown;
}
/** ADDON GETTER (Singleton Pattern): a editor can have only one Click instance */
export declare const getAddon: (cm: CodeMirror.Editor) => Click;
declare global {
    namespace HyperMD {
        interface HelperCollection {
            Click?: Click;
        }
    }
}
