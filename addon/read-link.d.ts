import * as CodeMirror from 'codemirror';
import { Addon } from '../core';
import { cm_t } from '../core/type';
/********************************************************************************** */
export interface Link {
    line: number;
    content: string;
}
export declare type CacheDB = {
    [lowerTrimmedKey: string]: Link[];
};
/**
 * Normalize a (potentially-with-title) URL string
 *
 * @param content eg. `http://laobubu.net/page "The Page"` or just a URL
 */
export declare function splitLink(content: string): {
    url: string;
    title: string;
};
/********************************************************************************** */
export declare const Extensions: {
    /**
     * Try to find a footnote and return its lineNo, content.
     *
     * NOTE: You will need `hmdSplitLink` and `hmdResolveURL` if you want to get a URL
     *
     * @param footNoteName without square brackets, case-insensive
     * @param line since which line
     */
    hmdReadLink(this: CodeMirror.Editor, footNoteName: string, line?: number): void | Link;
    /**
     * Check if URL is relative URL, and add baseURI if needed; or if it's a email address, add "mailto:"
     *
     * @see ReadLink.resolve
     */
    hmdResolveURL(this: CodeMirror.Editor, url: string, baseURI?: string): string;
    hmdSplitLink: typeof splitLink;
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
    /**
     * BaseURI (without filename) used to resolve relative URLs
     * If not empty, this will affect `editor.hmdResolveURL("./relative/url")`
     *
     * @example "https://laobubu.net/HyperMD/docs/zh-CN/"
     */
    baseURI: string;
}
export declare const defaultOption: Options;
export declare const suggestedOption: Partial<Options>;
export declare type OptionValueType = Partial<Options> | string;
declare global {
    namespace HyperMD {
        interface EditorConfiguration {
            /**
             * If not empty, this will affect `editor.hmdResolveURL()` if the URL of result is relative.
             *
             * Also affects other addons, eg. opening links, showing images...
             */
            hmdReadLink?: OptionValueType;
        }
    }
}
/********************************************************************************** */
export declare class ReadLink implements Addon.Addon, Options {
    cm: cm_t;
    baseURI: string;
    cache: CacheDB;
    constructor(cm: cm_t);
    /**
     * get link footnote content like
     *
     * ```markdown
     *  [icon]: http://laobubu.net/icon.png
     * ```
     *
     * @param footNoteName case-insensive name, without "[" or "]"
     * @param line         current line. if not set, the first definition will be returned
     */
    read(footNoteName: string, line?: number): (Link | void);
    /**
     * Scan content and rebuild the cache
     */
    rescan(): void;
    /**
     * Check if URL is relative URL, and add baseURI if needed
     *
     * @example
     *
     *     resolve("<email address>") // => "mailto:xxxxxxx"
     *     resolve("../world.png") // => (depends on your editor configuration)
     *     resolve("../world.png", "http://laobubu.net/xxx/foo/") // => "http://laobubu.net/xxx/world.png"
     *     resolve("../world.png", "http://laobubu.net/xxx/foo") // => "http://laobubu.net/xxx/world.png"
     *     resolve("/world.png", "http://laobubu.net/xxx/foo/") // => "http://laobubu.net/world.png"
     */
    resolve(uri: string, baseURI?: string): string;
}
/** ADDON GETTER (Singleton Pattern): a editor can have only one ReadLink instance */
export declare const getAddon: (cm: CodeMirror.Editor) => ReadLink;
declare global {
    namespace HyperMD {
        interface HelperCollection {
            ReadLink?: ReadLink;
        }
    }
}
