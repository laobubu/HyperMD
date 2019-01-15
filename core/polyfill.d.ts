/**
 * Provides some common PolyFill
 *
 * @internal Part of HyperMD core.
 *
 * You shall NOT import this file; please import "core" instead
 */
declare interface ObjectConstructor {
    assign(...objects: Object[]): Object;
}
