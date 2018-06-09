import * as fs from "fs"
import * as path from "path"
import { basePath } from "./base"

// load makerModules, compile and write files.
// a makerModule shall export a function `make: ()=>string`

execMaker("configurations.md", "./make_configurations")

//-------------------------------------------------------------

function execMaker(filename: string, makerModule: string) {
  const make = require(makerModule).make
  const fn = path.join(basePath, "docs", filename)

  console.log("[HyperMD] [docgen] Make: " + filename)

  try {
    var text = make()
  } catch (err) {
    console.error("[HyperMD] [docgen] ERROR: " + filename)
    console.error(err)
    process.exit(1)
  }

  fs.writeFile(fn, text, (err) => {
    if (err) {
      console.error("[HyperMD] Failed to write doc: " + filename)
      console.error(err)
      process.exit(1)
    }

    console.log("[HyperMD] [docgen] OK: " + filename)
  })
}
