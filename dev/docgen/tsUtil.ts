import * as ts from "typescript"
import * as fs from "fs"
import * as path from "path"
import { srcPath, langService } from "./base"
import { SyntaxKind } from "typescript";

export function getNamedDeclarations(sf: ts.SourceFile): Map<string, ReadonlyArray<ts.NamedDeclaration>> {
  const symEND = Symbol("ExportedNamedDeclarations")
  if (symEND in sf) return sf[symEND]

  // var sf_any = sf as any
  // if (sf_any.namedDeclarations) ans = sf_any.namedDeclarations
  // else if (typeof sf_any['getNamedDeclarations'] === 'function') ans = sf_any.getNamedDeclarations()
  // else throw new Error("Not Implemented")

  var ans = sf[symEND] = new Map<string, Array<ts.NamedDeclaration>>()
  ts.forEachChild(sf, visit)
  return ans

  function addDeclaration(name: string, item: ts.NamedDeclaration) {
    if (!name) return

    var list = ans.get(name)
    if (!list) ans.set(name, list = [])
    list.push(item)
  }

  function getDeclarationName(declaration: ts.Declaration) {
    const name = ts.getNameOfDeclaration(declaration);
    return name && (
      ts.isComputedPropertyName(name) && ts.isPropertyAccessExpression(name.expression) ? name.expression.name.text :
        ts.isPropertyName(name) ? (name as any).text : undefined);
  }

  function visit(node: ts.Node) {
    if (!isExported(node)) return

    var name: string

    switch (node.kind) {
      case SyntaxKind.FunctionDeclaration:
      case SyntaxKind.FunctionExpression:
      case SyntaxKind.MethodDeclaration:
      case SyntaxKind.MethodSignature:
      case SyntaxKind.ClassDeclaration:
      case SyntaxKind.ClassExpression:
      case SyntaxKind.InterfaceDeclaration:
      case SyntaxKind.TypeAliasDeclaration:
      case SyntaxKind.EnumDeclaration:
      case SyntaxKind.ModuleDeclaration:
      case SyntaxKind.ImportEqualsDeclaration:
      case SyntaxKind.ExportSpecifier:
      case SyntaxKind.ImportSpecifier:
      case SyntaxKind.ImportClause:
      case SyntaxKind.NamespaceImport:
      case SyntaxKind.GetAccessor:
      case SyntaxKind.SetAccessor:
      case SyntaxKind.TypeLiteral:
      case SyntaxKind.VariableDeclaration:
        name = getDeclarationName(<ts.Declaration>node)
        addDeclaration(name, <ts.Declaration>node);
        break;

      case SyntaxKind.VariableDeclarationList:
        let vdlNode = <ts.VariableDeclarationList>node;
        vdlNode.declarations.forEach(vdNode => {
          name = getDeclarationName(vdNode)
          addDeclaration(name, vdNode)
        })
        break;
    }
  }
}

export function isExported(node: ts.Node) {
  if (!node || !node.modifiers) return false
  return node.modifiers.some(n => n.kind === SyntaxKind.ExportKeyword)
}
