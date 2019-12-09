import { Attributes } from "../addon/fold";

export function ErrorWidget(attributes: Attributes) {
  const el = document.createElement("span");
  el.innerHTML = `error: ${attributes["message"] || "Unknown error"}`;
  return el;
}
