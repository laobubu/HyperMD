export * from "./core/type";
export * from "./core/utils";
export * from "./core/quick";
export * from "./core/cm_utils";
export * from "./core/line-spans";
// export * from "./preview/index"; // <= Circular reference

import * as Addon from "./core/addon";
export { Addon };

declare global {
  interface Window {
    cm: any;
    setMenuContainerAttr: any;
  }
}