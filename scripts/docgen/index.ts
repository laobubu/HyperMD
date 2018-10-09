import * as fs from "fs"
import * as path from "path"
import { basePath } from "./base"

// load makerModules, compile and write files.
// a makerModule shall export a function `make: ()=>string`

Promise.all([
  execMaker("options-for-addons.md", "./make_options_for_addons"),
  execMaker("powerpacks.md", "./make_powerpacks"),
])

//-------------------------------------------------------------

async function execMaker(filename: string, makerModule: string) {
  const make = require(makerModule).make
  const fn = path.join(basePath, "docs", filename)

  console.log("[HyperMD] [docgen] Make: " + filename)

  var text: string
  try {
    var ans: string | Promise<string> | Iterable<string> = make()
    if (typeof ans === "string") text = ans
    else if (ans instanceof Promise) text = await ans
    else { // generator
      text = ""
      for (const line of ans) {
        text += line + "\n"
      }
    }
  } catch (err) {
    console.error("[HyperMD] [docgen] ERROR: " + filename)
    console.error(err)
    process.exit(1)
  }

  await new Promise((res, rej) => {
    fs.writeFile(fn, text, (err) => {
      if (err) {
        console.error("[HyperMD] Failed to write doc: " + filename)
        console.error(err)
        process.exit(1)
        rej(err)
      }

      console.log("[HyperMD] [docgen] OK: " + filename)
      res()
    })
  })
}
