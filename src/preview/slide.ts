import { stringifyAttributes } from "../addon/attributes/index";

export function parseSlides(html: string, slideConfigs: object[]) {
  let slides = html.split("<p>[MUMESLIDE]</p>");
  const before = slides[0];
  slides = slides.slice(1);

  let output = "";
  let i = 0;
  let h = -1; // horizontal
  let v = 0; // vertical
  while (i < slides.length) {
    const slide = slides[i];
    const slideConfig = slideConfigs[i];

    // resolve paths in slideConfig
    if ("data-background-image" in slideConfig) {
      slideConfig["data-background-image"] =
        slideConfig["data-background-image"];
    }
    if ("data-background-video" in slideConfig) {
      slideConfig["data-background-video"] =
        slideConfig["data-background-video"];
    }
    if ("data-background-iframe" in slideConfig) {
      slideConfig["data-background-iframe"] =
        slideConfig["data-background-iframe"];
    }

    const attrString = stringifyAttributes(slideConfig, false); // parseAttrString(slideConfig)
    const classString = slideConfig["class"] || "";
    const idString = slideConfig["id"] ? `id="${slideConfig["id"]}"` : "";

    if (!slideConfig["vertical"]) {
      h += 1;
      if (i > 0 && slideConfigs[i - 1]["vertical"]) {
        // end of vertical slides
        output += "</section>";
        v = 0;
      }
      if (i < slides.length - 1 && slideConfigs[i + 1]["vertical"]) {
        // start of vertical slides
        output += "<section>";
      }
    } else {
      // vertical slide
      v += 1;
    }

    output += `<section ${attrString} ${idString}  class=\"slide ${classString}\" data-line="${slideConfig["lineNo"]}" data-h=\"${h}\" data-v="${v}">${slide}</section>`;
    i += 1;
  }
  if (i > 0 && slideConfigs[i - 1]["vertical"]) {
    // end of vertical slides
    output += "</section>";
  }

  /*
  // check list item attribtues
  // issue: https://github.com/shd101wyy/markdown-preview-enhanced/issues/559
  const $ = cheerio.load(output);
  $("li").each((j, elem) => {
    const $elem = $(elem);
    const html2 = $elem.html().trim();
    const attributeMatch = html2.match(/<!--(.+?)-->/);
    if (attributeMatch) {
      const attributes = attributeMatch[1].replace(/\.element\:/, "").trim();
      const attrObj = parseAttributes(attributes);
      for (const key in attrObj) {
        if (attrObj.hasOwnProperty(key)) {
          $elem.attr(key, attrObj[key]);
        }
      }
    }
  });
  */

  return `
  <div style="display:none;">${before}</div>
  <div class="reveal">
    <div class="slides">
      ${output}
    </div>
  </div>
  `;
}
