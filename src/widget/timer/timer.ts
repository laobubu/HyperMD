// 0xGG Team
// Distributed under AGPL3
//
// DESCRIPTION: This widget displays time related information

import { Attributes } from "../../addon/fold";
import { ErrorWidget } from "../error/error";

export function TimerWidget(attributes: Attributes) {
  const el = document.createElement("div");
  el.classList.add("widget-timer");
  el.style.padding = "4px 12px";
  el.style.backgroundColor =
    attributes["backgroundColor"] || "rgb(250, 145, 1)";
  el.style.color = attributes["color"] || "#fff";
  el.style.borderRadius = "16px";
  el.style.display = "flex";
  el.style.justifyContent = "space-between";
  el.style.width = "375px";
  el.style.maxWidth = "100%";
  el.style.boxShadow = "0 1px 3px 1px #aaa";

  if (!attributes["date"]) {
    return ErrorWidget({ message: "Field 'date' is missing." });
  }

  const dateEl = document.createElement("div");
  dateEl.classList.add("widget-timer-date");
  const date = new Date(attributes["date"]);
  dateEl.innerText = "⌚ " + date.toLocaleString();

  const durationEl = document.createElement("div");
  durationEl.classList.add("widget-timer-duraction");
  let duration = attributes["duration"] || "";
  if (duration) {
    duration = "🎬 " + duration;
  }
  durationEl.innerText = duration;

  el.appendChild(dateEl);
  el.appendChild(durationEl);
  return el;
}
