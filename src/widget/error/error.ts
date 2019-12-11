// 0xGG Team
// Distributed under AGPL3
//
// DESCRIPTION: The error widget that displays the error message

interface ErrorParams {
  message: string;
}
export function ErrorWidget(attributes: ErrorParams) {
  const el = document.createElement("span");
  el.style.color = "#f50";
  el.innerHTML = `error: ${attributes["message"] || "Unknown error"}`;
  return el;
}
