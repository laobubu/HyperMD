import { Attributes } from "../../addon/fold";

interface ErrorParams {
  message: string;
}
export function ErrorWidget(attributes: ErrorParams) {
  const el = document.createElement("span");
  el.style.color = "#f50";
  el.innerHTML = `error: ${attributes["message"] || "Unknown error"}`;
  return el;
}
