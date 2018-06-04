import * as fs from "fs"
import * as path from "path"

import { basePath } from "./base"
import { make as maker1 } from "./configurations.md"

function execMaker(filename: string, maker: () => string) {
  const fn = path.join(basePath, "docs", filename)
  fs.writeFile(fn, maker(), (err) => {
    if (err) {
      console.error("[HyperMD] Failed to write doc: " + filename)
      console.error(err)
      process.exit(1)
    }

    console.log("[HyperMD] doc: " + filename)
  })
}

execMaker("configurations.md", maker1)
