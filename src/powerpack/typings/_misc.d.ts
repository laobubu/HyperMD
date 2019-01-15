// This file contains short and brief typings
// As an alternative to optional `@types/***` packages.
//
// For HyperMD Development only

//#region twemoji ---------------------------------------------------
declare module "twemoji" {
  /** Given a generic string, replaces all emoji with an <img> tag. */
  export function parse(text: string, options?: any): string;

  /** In contrast to string parsing, if the first argument is an HTMLElement, generated image tags will replace emoji that are inside #text nodes only without compromising surrounding nodes or listeners, and completely avoiding the usage of innerHTML. */
  export function parse(dom: HTMLElement): void;
}
//#endregion

//#region katex ---------------------------------------------------
declare module "katex" {
  export function render(expr: string, target: HTMLElement, opts?: any);
}
//#endregion

//#region emojione ---------------------------------------------------
declare module "emojione" {
  /**
   * Convert Shortnames to Images
   *
   * If you've chosen to unify your inputted text so that it contains only shortnames then this is the function (or its matching PHP function) you will want to use to convert the shortnames images when displaying it to the client.
   */
  export function shortnameToImage(str: string): string;

  /**
   * Convert Native Unicode Emoji and Shortnames Directly to Images
   *
   * This function is simply a shorthand for .unicodeToImage(str) and .shortnameToImage(str). First it will convert native unicode emoji directly to images and then convert any shortnames to images. This function can be useful to take mixed input and convert it directly to images if, for example, you wanted to give clients a live preview of their inputted text. Also, if your source text contains both unicode characters and shortnames (you didn't unify it) then this function will be useful to you.
   */
  export function toImage(str: string): string;

  /**
   * Convert Native Unicode Emoji Directly to Images
   *
   * If you have native unicode emoji characters that you want to convert directly to images, you can use this function. It should be noted that once your input text has been converted to images it cannot be converted back using the provided functions.
   */
  export function unicodeToImage(str: string): string;

  /**
   * Convert Shortnames to Native Unicode
   *
   * If you'd like to convert shortnames back to native unicode emoji characters, you can use this function.
   */
  export function shortnameToUnicode(str: string): string;
}
//#endregion

//#region marked ---------------------------------------------------
declare function marked(text: string): string;
declare module marked { }
declare module "marked" { export = marked; }
//#endregion
