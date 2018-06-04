import { sys } from "typescript"
import { langService, doctmp, findMark, updateDocTmp } from "./base"

interface OptionItem {
  name: string,
  provider: string, // "addon/foobar"
  providerDesc: string, // addon description in one line
  optional: boolean,
  description: string,
  type: string,

  /** If Accept a Partial<Object>, this stores all possible members */
  objProp?: Record<string, {
    description: string,
    type: string,
    default: string,
  }>,
}

const options: OptionItem[] = []

/** emulate auto-completition to get all acceptable options */

updateDocTmp(`
  var c: HyperMD.EditorConfiguration = {
    /*1*/
  }
  `)

var markPos = findMark("1")
langService.getCompletionsAtPosition(doctmp, markPos, {
  includeExternalModuleExports: true,
  includeInsertTextCompletions: false,
}).entries.forEach(it => {
  if (it.kind !== "property") return

  const { name } = it

  var ac = langService.getCompletionEntryDetails(doctmp, markPos, name, {}, /*content*/ undefined)

  var type = ac.displayParts.map(x => x.text).join("").replace(/^.+?\:\s*/, '')
  var description = ac.documentation.map(x => x.text).join("\n\n")

  var oi: OptionItem = {
    name,
    provider: null,
    providerDesc: "",
    type,
    description,
    optional: it.kindModifiers.includes("optional"),
    objProp: /Partial\<.+\>/.test(type) ? {} : null,
  }

  options.push(oi)
})

/** for each OptionItem, retrive its detail info! */

options.forEach(opt => {
  const { name, objProp } = opt

  updateDocTmp(`
    var c: HyperMD.EditorConfiguration = {
      /*2*/${name}: { /*3*/ }
    }
    `)

  var def = langService.getDefinitionAtPosition(doctmp, findMark('2') + 6)
  var providerFile = def[0].fileName // addon's filename
  var providerCode = sys.readFile(providerFile) // addon's source code!

  opt.provider = providerFile.match(/src\/(.+)\.ts$/)[1]
  opt.providerDesc = providerCode.match(/^(?:\/\/|\s*\*)?\s+DESCRIPTION:\s*(.+)$/m)[1]

  if (objProp) {
    // this option may accept a object
    // find out what does it support

    let markPos = findMark('3')

    // Find defaultOption declarations
    let defaultValues = {}
    {
      // extract {...}
      let defSince = providerCode.match(/^.+defaultOption(?:\s*\:\s*\w+)\s*=\s*\{/m)
      if (defSince) {
        let t = providerCode.slice(defSince.index + defSince[0].length)

        t.slice(0, t.match(/^\s*\}/m).index) // get content inside { ... }
          .trim()
          .split("\n")
          .forEach(x => {
            var tmp = x.match(/^\s*(\S+)\s*\:\s*(.+)$/)
            if (!tmp) return;
            defaultValues[tmp[1]] = tmp[2].replace(/^\s+|\s*(?:\,\s*)?(?:\/\/.*)?$|\s+$/g, '');
          })
      }
    }

    // check what Partial<Options> accepts
    langService.getCompletionsAtPosition(doctmp, markPos, {
      includeExternalModuleExports: true,
      includeInsertTextCompletions: false,
    }).entries.forEach(it => {

      if (it.kind !== "property") return
      const { name } = it

      var ac = langService.getCompletionEntryDetails(doctmp, markPos, name, {}, /*content*/ undefined)

      var type = ac.displayParts.map(x => x.text).join("").replace(/^.+?\:\s*/, '')
      var description = ac.documentation.map(x => x.text).join("\n\n")
      var defaultVal = "undefined"

      objProp[name] = {
        description,
        type,
        default: defaultValues[name] || "undefined",
      }
    })
  }
})

console.log(`# HyperMD Configurations

| Name | Addon | Addon Description |
| ---- | ---- | ---- |
${options.map(x => `| ${x.name} | [${x.provider}](https://github.com/laobubu/HyperMD/tree/master/src/${x.provider}.ts) | ${x.providerDesc} |`).join("\n")}

`)


options.forEach(opt => {
  console.log(`
## ${opt.name}

*Provided by [${opt.provider}](https://github.com/laobubu/HyperMD/tree/master/src/${opt.provider}.ts)*

*Accepted Types*: \`${opt.type.replace(/Partial\<\w+\>/g, 'object')}\`

${opt.description}

`)

  if (opt.objProp) {
    var multiLineDescriptions = "" // maybe some prop's description span lines

    console.log(`| Name | Type | Description |
| ---- | ---- | ----------- |`)
    for (const key in opt.objProp) {
      let description = opt.objProp[key].description.replace(/^\s*\@\w+/gm, '***$1*** ')
      if (description.includes("\n")) {
        multiLineDescriptions += [
          `### ${opt.name}.${key}`,
          description,
          "",
        ].join("\n\n")
        description = "(See Below)"
      }
      console.log(`| ${key} | \`${opt.objProp[key].type.replace(/\n\s*/g, ' ')}\` | ${description} |`)
    }

    if (multiLineDescriptions) {
      console.log("\n")
      console.log(multiLineDescriptions)
    }

    console.log("\n\n")
  }
})
