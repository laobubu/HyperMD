import * as ts from "typescript"
import * as path from "path"
import { srcPath, langService, packageJSON, projectInfo } from "./base"

import { getNamedDeclarations, isExported } from "./tsUtil";
import { getLineNo, strModPart } from "./strUtil";

//////////////////////////////////////////////////////////////

export type MarkdownText = string

/**
 * Automatically add markdown links to NamedDeclaration
 */
export function autoLinkNamedDeclarations(text: string | MarkdownText, sf: ts.SourceFile): MarkdownText {
  var declsMap = getNamedDeclarations(sf)
  var matcher = /`+|\w+/g, tmp: RegExpExecArray
  var sfText = sf.text

  var insideCode: string = null

  while (tmp = matcher.exec(text)) {
    var name = tmp[0]

    if (!insideCode && name.charAt(0) === "`") {
      insideCode = name; // enter inline-code
    } else if (insideCode) {
      if (name === insideCode) insideCode = null // exit
      continue
    }

    var decls = declsMap.get(name)
    if (!decls || decls.length !== 1) continue // fixme: current not support multi declarations

    for (const decl of decls) {
      // if ([
      //   ts.SyntaxKind.TypeAliasDeclaration,
      //   ts.SyntaxKind.ClassDeclaration,
      //   ts.SyntaxKind.InterfaceDeclaration,
      //   ts.SyntaxKind.VariableDeclaration,
      //   ts.SyntaxKind.VariableDeclarationList,
      //   ts.SyntaxKind.FunctionDeclaration,
      // ].indexOf(decl.kind) === -1) {
      //   continue
      // }

      if (!isExported(decl)) continue

      var pos = decl.getStart(sf)
      if (decl['jsDoc'] && decl['jsDoc'].length > 0) pos = Math.min(pos, decl['jsDoc'][0].getStart(sf))

      var lineNo = getLineNo(sfText, pos)
      var insertion = makeLink(name, getComponentURL(sf.fileName, `#L${lineNo}`))

      text = strModPart(text, tmp.index, matcher.lastIndex, insertion)
      matcher.lastIndex += insertion.length - name.length
      break
    }
  }

  return text
}

export function makeDescription(node: ts.JSDocContainer, sf: ts.SourceFile): MarkdownText {
  var docs = (node as any).jsDoc as ts.NodeArray<ts.JSDoc>
  if (!docs || !docs.length) return ""

  var ans = [] as string[]

  for (const doc of docs) {
    if (ts.isJSDocCommentContainingNode(doc)) {
      let { comment, tags } = doc

      if (comment) {
        ans.push(autoLinkNamedDeclarations(comment, sf))
        if (tags && tags.length) ans.push("")
      }

      if (tags) for (const tag of tags) {
        let tagName = tag.tagName.text
        let tagComment = tag.comment

        let it = `👉 ***${tagName}***`
        if (tagComment) {
          let isCode = ["example"].indexOf(tagName) >= 0 || /^['"]/.test(tagComment)

          if (tagComment.includes("\n")) {
            it += "\n"
            if (isCode) it += "```\n"
            it += tagComment
            if (isCode) it += "```"
            it += "\n"
          } else {
            // tagComment is single-lined
            it += " "
            if (isCode) it += `\`${tagComment}\``
            else it += autoLinkNamedDeclarations(tagComment, sf)
          }
        }
        ans.push(it)
      }
    }
  }

  var text = ans.join("\n").replace(/\r+/g, '').trim()
  return text
}

/**
 * Get URL to Source File
 *
 * @param component "addon/fold" or "c:/xxx/src/addon/fold.ts"
 * @param extra "#L7"
 */
export function getComponentURL(component: string, extra?: string) {
  if (path.isAbsolute(component)) component = component.slice(srcPath.length)
  if (!/\.ts$/.test(component)) component += ".ts"
  component = component.replace(/\\/g, '/').replace(/^\/+/, '')

  return `https://github.com/laobubu/HyperMD/tree/${projectInfo.git}/src/${component}${extra || ""}`
}

export function makeLink(text: string, link?: string) {
  if (!link) return text
  return `[${text}](${link})`
}

/**
 * Create a Markdown Link to a source file
 *
 * @param component "addon/fold" or "c:/xxx/src/addon/fold.ts"
 * @param extra "#L7"
 */
export function makeComponentLink(component: string, extra?: string): MarkdownText {
  var shortName = component
  if (path.isAbsolute(shortName)) shortName = shortName.slice(srcPath.length)
  shortName = shortName.replace(/\\/g, '/').replace(/^\/+|\.ts$/g, '')

  return makeLink(shortName, getComponentURL(component, extra))
}

export function commentsToText(commentNodes: ReadonlyArray<ts.CommentRange>, sf: ts.SourceFile) {
  var ans = [] as string[]
  if (!commentNodes) return ""

  var sfText = sf.text

  for (const node of commentNodes) {
    if (node.kind === ts.SyntaxKind.SingleLineCommentTrivia) {
      let it = sfText
        .slice(node.pos, node.end)
        .replace(/^\s*\/\/\s?/, '')
      if (!/^\/\s*<reference/.test(it)) ans.push(it) // ignore ts tripe-slash reference
    } else if (node.kind === ts.SyntaxKind.MultiLineCommentTrivia) {
      ans.push(
        sfText
          .slice(node.pos, node.end)
          .replace(/^\s*\/\*+\s*/, '')
          .replace(/\s*\*+\/\s*$/, '')
          .replace(/^\s*\*\s?/m, '')
      )
    }
  }
  return ans.join("\n")
}

/**
 * Get Text description for a type, and add links.
 *
 * @example
 *    type X = CallbackFunc | string
 *
 *    input  = NodeOf(X)
 *    output = "[CallBackFunc](link_to_source) _or_ `string`"
 *
 * @param resolveTypeReference if `true` and node is a TypeReference, try to resolve and use the actual type.
 */
export function makeTypeString(node: ts.TypeNode, sf: ts.SourceFile, resolveTypeReference: boolean = true): MarkdownText {
  if (!node) return ""

  if (ts.isTypeReferenceNode(node)) {
    if (!resolveTypeReference) {
      let ans = autoLinkNamedDeclarations(node.getText(sf), sf)
      ans = ans.replace(/\<\w/g, '\\$1')   // it is not HTML tag
      return ans
    }

    while (ts.isTypeReferenceNode(node)) {
      let decls = getNamedDeclarations(sf).get(node.getText(sf))
      if (!decls) break // NOT FOUND

      for (const decl of decls) {
        if (ts.isTypeAliasDeclaration(decl)) { // found!
          node = decl.type
          break
        }
      }
      break // NOT FOUND?!
    }
  }

  if (ts.isParenthesizedTypeNode(node)) {
    let ans = autoLinkNamedDeclarations(node.getText(sf), sf)
    ans = ans.replace(/\<\w/g, '\\$1')   // it is not HTML tag
    return ans
  }

  if (ts.isUnionTypeNode(node)) {
    if (!resolveTypeReference) {
      return autoLinkNamedDeclarations(node.getText(sf), sf)
    }

    return node.types.map(n => makeTypeString(n, sf, false)).join(" _or_ ")
  }

  return "`" + node.getText(sf).replace(/\s*\n[\n\s]*/m, ' ') + "`"
}


export interface InterfaceProperty {
  node: ts.PropertySignature
  sf: ts.SourceFile

  name: string,
  type: MarkdownText,
  description: MarkdownText,
}

/**
 * Add all property declarations from `src` to `dst`
 *
 * @param postProcess optional. Check and post-process one item before add it to `dst`. Returns `true` if item is accepted
 */
export function extractInterfaceProperties<T extends InterfaceProperty>(src: ts.InterfaceDeclaration, dst: T[], sf: ts.SourceFile, postProcess?: (it: T) => boolean) {
  ts.forEachChild(src, (node) => {
    if (!ts.isPropertySignature(node)) return

    let it = {
      node, sf,

      name: node.name.getText(sf),
      description: makeDescription(node, sf),
      type: makeTypeString(node.type, sf),
    } as T

    if (postProcess && !postProcess(it)) return

    dst.push(it)
  })
}

/**
 * Make a Markdown Table (and "See below" part) from Array<InterfaceProperty>
 */
export function makePropertiesSection(props: InterfaceProperty[]): MarkdownText {
  if (!props || !props.length) {
    return "*(no property)*"
  }

  let tableLines = [
    "| Name | Type | Description |",
    "| ---- | ---- | ---- |",
  ]
  let appendix = [] as string[]

  for (const p of props) {
    let description = p.description
    let multiline = description.includes("\n")
    tableLines.push(`| ${p.name} | ${multiline ? " " : p.type} | ${multiline ? "*(See below)*" : description} |`)
    if (multiline) {
      appendix.push([
        `### ${p.name}`,
        ``,
        `🎨 **Type** : ${p.type}`,
        ``,
        description.replace(/^/gm, "> "),
      ].join("\n"))
    }
  }

  var ans = tableLines.join("\n")
  for (const it of appendix) ans += "\n\n" + it

  return ans
}

export function makeAutoDocNotice(makerFilename: string) {
  return `
> This document is generated by *dev/docgen/${path.basename(makerFilename)}* from source files.
> If you want to update this doc, edit corresponded source code.
>
> Based on HyperMD v${projectInfo.version} [(${projectInfo.gitClean ? "" : " with uncommited changes,"} git ${projectInfo.git} )](https://github.com/laobubu/HyperMD/tree/${projectInfo.git})
`.trim()
}
