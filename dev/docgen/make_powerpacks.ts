import * as ts from "typescript"
import * as path from "path"
import * as glob from "glob"
import { program, srcPath } from "./base"
import { commentsToText, makeLink, getComponentURL, makeTypeString, makeAutoDocNotice } from "./genUtils"
import { getNamedDeclarations } from "./tsUtil";
import { getLineNo } from "./strUtil";

export function* make(): IterableIterator<string> {
  yield `# PowerPacks

${makeAutoDocNotice(__filename)}

👈 *The built-in PowerPacks list is on the left*

**PowerPacks** are optional modules that integrate 3rd-party libs and services to HyperMD.

Note that PowerPacks will \`require\` related third-party libraries,
and update some HyperMD components' default options.

✨ **Usage (for bundler and module-loader users)**:

Before initializing a editor, import \`'hypermd/powerpack/some-powerpack-name'\` the module.

✨ **Usage (in plain browser env)**:

When HyperMD main modules and related third-party libs are loaded,
\`<script src="PATH_TO_HyperMD/powerpack/some-powerpack-name.js"></script>\`

Note that in plain browser env, PowerPack-exported things are stored in
\`window.HyperMD_PowerPack['some-powerpack-name']\`

------

`

  const fileList = glob.sync(path.join(srcPath, "powerpack/**/*.ts"))
  for (let filename of fileList) {
    if (/\.d\.ts$/.test(filename)) continue
    filename = filename.replace(/\\/g, '/')

    const name = path.basename(filename, ".ts")
    const normalizedName = filename.slice(filename.indexOf('powerpack'), -3) // "powerpack/foobar"
    var sf = program.getSourceFile(filename)

    yield ""
    yield "## " + name
    yield ""

    var imports: ts.NodeArray<ts.StringLiteral> = (sf as any).imports
    var tp_libs = new Set<string>() // {"katex"}
    var targets = new Set<string>() // ["addon/fold-math"]
    for (const node of imports) {
      var text = node.text
      if (text[0] != ".") tp_libs.add(/^[^/]+/.exec(text)[0])
      else {
        let cleanName = path.normalize(path.join(path.dirname(normalizedName), text))
          .replace(/\\/g, '/')
          .replace(/^\.\//, '')
        targets.add(cleanName)
      }
    }


    let tp_libs_str = ""
    for (const lib of tp_libs.values()) {
      tp_libs_str += "  " + makeLink(lib, 'https://www.npmjs.com/package/' + lib)
    }
    yield "📦 **Third-Party Libs**: " + (tp_libs_str || "(None)")
    yield ""


    let targets_str = ""
    for (const lib of targets.values()) {
      targets_str += "  " + makeLink(lib, getComponentURL(lib))
    }
    yield "🚀 **Related Components**: " + targets_str
    yield ""


    let exported = getNamedDeclarations(sf)
    let exported_str = [] as string[]
    exported.forEach((v, k) => {
      if (v.length != 1) return
      var node = v[0]

      var typeInfo = ""
      if (node['type']) typeInfo = makeTypeString(node['type'], sf, false)
      else if (ts.isFunctionDeclaration(node)) {
        let args = node.parameters
        typeInfo = "`function(" + sf.text.slice(args.pos, args.end) + ")"
        if (node.type) typeInfo += ": " + node.type.getText(sf)
        typeInfo += "`"
      }

      exported_str.push(
        "* " +
        makeLink("**" + k + "**", getComponentURL(normalizedName, "#L" + getLineNo(sf.text, node.getStart(sf)))) +
        (typeInfo ? "   Type: " + typeInfo : "")
      )
    })

    if (exported_str.length) {
      yield "🚢 **Provides**:"
      yield ""
      yield exported_str.join("\n")
      yield ""
    }

    // get leading comments
    yield "📕 **Description**:"
    yield ""
    yield commentsToText(ts.getLeadingCommentRanges(sf.text, 0), sf)
    yield ""
    yield ""
  }
}

if (require.main === module) {
  for (const line of make()) {
    console.log(line)
  }
}
