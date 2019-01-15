/**
 * Utils for HyperMD addons
 *
 * @internal Part of HyperMD core.
 *
 * You shall NOT import this file; please import "core" instead
 */
import { cm_t } from "./type";
export interface AddonOptions {
}
export declare abstract class Addon {
    cm: cm_t;
    constructor(cm: cm_t);
}
/** make a Singleton getter */
export declare function Getter<T extends Addon>(name: string, ClassCtor: {
    new (cm: cm_t): T;
}, defaultOption?: object): (cm: cm_t) => T;
