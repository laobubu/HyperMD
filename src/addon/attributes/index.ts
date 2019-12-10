// 0xGG Team
// Distributed under AGPL3
//
// DESCRIPTION: This library parses code block attributes

export interface Attributes {
  [key: string]: any;
}

export { default as parseAttributes } from "./parse";
