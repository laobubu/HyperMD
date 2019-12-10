// DESCRIPTION: Attributes related models & functions

import { Attributes } from ".";

/**
 * Convert attributes as JSON object to attributes as string
 * @param attributes
 */
export default function(
  attributes: Attributes,
  addCurlyBrackets: boolean = false
): string {
  const parts = [];
  for (const key in attributes) {
    if (attributes.hasOwnProperty(key)) {
      parts.push(" ");
      parts.push(`${key}=`);
      const value = attributes[key];
      if (value instanceof Array) {
        parts.push(stringifyArray(value));
      } else {
        parts.push(JSON.stringify(value));
      }
    }
  }
  parts.shift();
  if (addCurlyBrackets) {
    parts.unshift("{");
    parts.push("}");
  }
  return parts.join("");
}

function stringifyArray(value: any[]) {
  const parts = ["["];
  value.forEach((v, i) => {
    if (v instanceof Array) {
      parts.push(stringifyArray(v));
    } else {
      parts.push(JSON.stringify(v));
    }
    if (i + 1 !== value.length) {
      parts.push(", ");
    }
  });
  parts.push("]");
  return parts.join("");
}
