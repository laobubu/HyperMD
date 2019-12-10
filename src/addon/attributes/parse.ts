// DESCRIPTION: Attributes related models & functions

import { Attributes } from ".";

enum NodeType {
  QUOTED_STRING,
  WORD,
  ARRAY
}
type Node = [any, number, NodeType];

/**
 * Parses block attributes
 * @param text e.g. {#identifier .class1 .class2 key1=value1 key2=value2}
 */
export default function(text?: string): Attributes {
  // remove surrounding { } if exist
  let textToParse = (text || "").trim();
  if (textToParse[0] === "{" && textToParse[textToParse.length - 1] === "}") {
    textToParse = textToParse.slice(1, -1);
  }

  const output: Attributes = {};
  let pendingKey: string;
  let i = 0;
  while (i < textToParse.length) {
    const node: Node | void =
      extractArray(textToParse, i) ||
      extractQuotedString(textToParse, i) ||
      extractWord(textToParse, i);
    if (node) {
      const keyIsPending = typeof pendingKey === "string";
      const [rawValue, subEnd, nodeType] = node;
      const value =
        nodeType === NodeType.WORD && keyIsPending
          ? extractValue(rawValue)
          : rawValue;
      i = subEnd;
      if (keyIsPending) {
        output[pendingKey] = value;
        pendingKey = undefined;
      } else if (textToParse[i] === "=") {
        pendingKey = value;
      } else {
        const firstChar = value[0];
        let specialAttribute;
        switch (firstChar) {
          case ".":
            specialAttribute = "class";
            break;
          case "#":
            specialAttribute = "id";
            break;
        }
        if (specialAttribute) {
          const specialValue = value.substring(1);
          if (specialValue.length) {
            const previousValue = output[specialAttribute];
            output[specialAttribute] =
              typeof previousValue === "undefined"
                ? specialValue
                : `${previousValue} ${specialValue}`;
          }
        } else {
          if (typeof value === "string") {
            output[value] = true;
          }
        }
      }
    } else {
      // just skipping one character if it is not known for soft error handling
      i += 1;
    }
  }
  return output;
}

function extractQuotedString(text, start): Node | void {
  const quote = text[start];
  if (!"'\"`".includes(quote)) {
    return;
  }
  let end = start + 1;
  const chars = [];
  while (end < text.length) {
    if (text[end] === "\\") {
      if (end + 1 < text.length) {
        chars.push(text[end + 1]);
      }
      end += 2;
      continue;
    }
    if (text[end] === quote) {
      end += 1;
      break;
    }
    chars.push(text[end]);
    end += 1;
  }
  return [chars.join(""), end, NodeType.QUOTED_STRING];
}

const wordCharRegExp = /^[^,;=\s]$/;
function extractWord(text: string, start: number): Node | void {
  let i = start;
  let bracketDepth = 0;
  while (i < text.length) {
    const char = text[i];
    if (!wordCharRegExp.test(char)) {
      break;
    }
    if (char === "[") {
      bracketDepth += 1;
    } else if (char === "]") {
      bracketDepth -= 1;
    }
    if (bracketDepth < 0) {
      break;
    }
    i += 1;
  }
  if (i === start) {
    return;
  }
  return [text.substring(start, i), i, NodeType.WORD];
}

function extractArray(text, start): Node | void {
  if (text[start] !== "[") {
    return;
  }
  const result = [];
  let i = start + 1;
  while (i < text.length) {
    const char = text[i];
    if (char === "]") {
      i += 1;
      break;
    }

    const node: Node | void =
      extractArray(text, i) ||
      extractQuotedString(text, i) ||
      extractWord(text, i);
    if (node) {
      const [rawValue, subEnd, nodeType] = node;
      const value =
        nodeType === NodeType.WORD ? extractValue(rawValue) : rawValue;
      i = subEnd;
      result.push(value);
    } else {
      i += 1;
    }
  }
  return [result, i, NodeType.ARRAY];
}

function extractValue(value: string): boolean | number | string {
  // boolean
  if (value.toLowerCase() === "true") {
    return true;
  } else if (value.toLowerCase() === "false") {
    return false;
  } else if (!isNaN(value as any)) {
    // number
    return parseFloat(value as any);
  }
  return value;
}
