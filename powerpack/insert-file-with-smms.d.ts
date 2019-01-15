import { FileHandler } from "../addon/insert-file";
/**
 * Upload one image.
 *
 * @param callback called when finished/error. if success, a `url` is given
 */
export declare function Upload_One(file: File, callback: (url?: string) => void): void;
/**
 * SmMsFileHandler FileHandler
 *
 * accepts and uploads images, then inserts as `![](image_url)`
 */
export declare const SmMsFileHandler: FileHandler;
