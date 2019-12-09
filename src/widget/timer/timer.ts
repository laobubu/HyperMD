import { Attributes } from "../../addon/fold";

export function TimerWidget(attributes: Attributes) {
  const el = document.createElement("span");
  el.innerHTML = `widget ${JSON.stringify(attributes)}`;
  return el;
}
