import * as ts from "typescript"
import * as fs from "fs"
import * as path from "path"
import { srcPath, langService } from "./base"

import { getNamedDeclarations, isExported } from "./tsUtil";
import { getLineNo, strModPart } from "./strUtil";

//////////////////////////////////////////////////////////////

/**
 * Automatically add markdown links to NamedDeclaration
 */
export function autoLinkNamedDeclarations(text: string, sf: ts.SourceFile): string {
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

      var lineNo = getLineNo(sfText, decl.pos)
      var insertion = makeLink(name, getComponentURL(sf.fileName, `#L${lineNo}`))

      text = strModPart(text, tmp.index, matcher.lastIndex, insertion)
      matcher.lastIndex += insertion.length - name.length
      break
    }
  }

  return text
}

export function makeDescription(node: ts.JSDocContainer, sf: ts.SourceFile): string {
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

  return `https://github.com/laobubu/HyperMD/tree/master/src/${component}${extra || ""}`
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
export function makeComponentLink(component: string, extra?: string) {
  var shortName = component
  if (path.isAbsolute(shortName)) shortName = shortName.slice(srcPath.length)
  shortName = shortName.replace(/\\/g, '/').replace(/^\/+|\.ts$/g, '')

  return makeLink(shortName, getComponentURL(component, extra))
}

export function commentsToText(commentNodes: ReadonlyArray<ts.CommentKind>) {
  return ""
}

export function makeTypeString(node: ts.TypeNode, sf: ts.SourceFile, resolveTypeReference: boolean = true): string {
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
