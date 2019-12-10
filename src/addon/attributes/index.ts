export interface Attributes {
  [key: string]: any;
}

export { default as normalizeAttributes } from "./normalize";
export { default as parseAttributes } from "./parse";
export { default as stringifyAttributes } from "./stringify";
