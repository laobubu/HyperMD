// This file contains short and brief typings

//#region katex ---------------------------------------------------
declare module "katex" {
  export function render(expr: string, target: HTMLElement, opts?: any);
}
//#endregion

//#region marked ---------------------------------------------------
declare function marked(text: string): string;
declare module marked { }
declare module "marked" { export = marked; }
//#endregion
