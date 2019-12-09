import { Attributes } from "../../addon/fold";

export function ErrorWidget(attributes: Attributes) {
  const el = document.createElement("span");
  el.style.color = "#f50";
  el.innerHTML = `error: ${attributes["message"] || "Unknown error"}`;
  return el;
}
