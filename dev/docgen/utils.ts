import * as ts from "typescript"
import * as fs from "fs"
import * as path from "path"
import { langService } from "./base"

//////////////////////////////////////////////////////////////

export function getPropDescription(ac: ts.CompletionEntryDetails, srcFile?: string): string {
  var description = ac.documentation.map(x => x.text).join("\n\n")

  for (const tag of ac.tags) {
    if (tag.name === "example") {
      description += "\n⭐ ***Example***"

      if (tag.text.includes("\n")) description += "\n```js\n" + tag.text + "\n```\n"
      else description += ": `" + tag.text + "`"
    }

    if (tag.name === "see") {
      let link: string = null, text = tag.text
      if (srcFile) {
        let code = fs.readFileSync(srcFile, "utf-8")
        let tmp = code.match(new RegExp('(class|const|var|function|type|interface)\\s+' + text))
        if (tmp) {
          link = getComponentURL(srcFile.match(/src\/(.+)\.ts$/)[1], "#L" + code.slice(0, tmp.index).split("\n").length)
        }
      }
      description += "\n" + "👉 ***See*** " + makeLink(text, link)
    }
  }

  return description
}

/**
 * Get URL to Source File
 *
 * @param component "addon/fold"
 * @param extra "#L7"
 */
export function getComponentURL(component: string, extra?: string) {
  return `https://github.com/laobubu/HyperMD/tree/master/src/${component}.ts${extra || ""}`
}

export function makeLink(text: string, link?: string) {
  if (!link) return text
  return `[${text}](${link})`
}

export function getComponentLink(component: string, extra?: string) {
  return makeLink(component, getComponentURL(component, extra))
}
