//
// Load tsconfig, initialize `program` (AST parser & compiler) and `langService` (LanguageService, to emulate auto-completition)
//
// A dummy file whose filepath is `doctmp`, is prepared to emulate auto-completition. You may:
//
// 1. Fill the dummy file:    updateDocTmp("var xxx:HyperMD.SomeInterface = { /*1*/ }")
// 2. Find the marker:        pos = findMark("1")
// 3. Extract Info:           info = langService.getTypeDefinitionAtPosition(doctmp, pos)
//

import * as ts from "typescript"
import * as fs from "fs"
import * as path from "path"
import * as child_process from "child_process"

const sys = ts.sys
export const basePath = path.normalize(path.join(__dirname, "../.."));

function getCommandLine(basePath: string) {
  const configPath = ts.findConfigFile(basePath, fs.existsSync);
  const parsed = ts.parseConfigFileTextToJson(configPath, sys.readFile(configPath));
  const configParseResult = ts.parseJsonConfigFileContent(parsed.config, sys, basePath, null, configPath);

  return configParseResult;
}

function getCompileProgram(cl: ts.ParsedCommandLine) {
  const compilerHost: ts.CompilerHost = {
    getSourceFile: (s, v) => {
      const content = sys.readFile(s);
      return content !== undefined ? ts.createSourceFile(s, content, v) : undefined;
    },
    getCurrentDirectory: () => process.cwd(),
    getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
    useCaseSensitiveFileNames: () => sys.useCaseSensitiveFileNames,
    writeFile: (f: string, content: string) => {
      if (content) {
        console.log("trying to write " + f)
        console.log(content.slice(0, 100))
      }
    },
    getCanonicalFileName: (f: string) => sys.useCaseSensitiveFileNames ? f : f.toLowerCase(),
    getNewLine: () => ts.sys.newLine,

    getDirectories: sys.getDirectories,
    directoryExists: sys.directoryExists,
    fileExists: sys.fileExists,
    readFile: sys.readFile,
  };

  const program = ts.createProgram(cl.fileNames, cl.options, compilerHost)
  return program
}

function getLanguageService(cl: ts.ParsedCommandLine, virtualFiles: Record<string, string>) {
  const rootFileNames = cl.fileNames.slice(0);
  const files: ts.MapLike<{ version: number }> = {};

  const fileContent: Record<string, string> = virtualFiles;

  /** change file content but not write to disk! */
  function updateFile(fileName: string, content: string) {
    files[fileName].version++
    fileContent[fileName] = content
  }

  for (const vFileName in virtualFiles) {
    if (rootFileNames.indexOf(vFileName) === -1) rootFileNames.push(vFileName)
  }

  // initialize the list of files
  rootFileNames.forEach(fileName => {
    files[fileName] = { version: 0 };
  });

  // Create the language service host to allow the LS to communicate with the host
  const host: ts.LanguageServiceHost = {
    getScriptFileNames: () => rootFileNames,
    getScriptVersion: (fileName) => files[fileName] && files[fileName].version.toString(),
    getScriptSnapshot: (fileName) => {
      const isVirtual = (fileName in fileContent);
      if (!isVirtual && !fs.existsSync(fileName)) return undefined;
      return ts.ScriptSnapshot.fromString(isVirtual ? fileContent[fileName] : fs.readFileSync(fileName).toString());
    },
    getCurrentDirectory: () => process.cwd(),
    getCompilationSettings: () => cl.options,
    getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
  };

  // Create the language service files
  const service = ts.createLanguageService(host, ts.createDocumentRegistry())

  return { service, host, updateFile }
}

export const commandLine = getCommandLine(basePath);
export const program = getCompileProgram(commandLine);

export const srcPath = path.join(basePath, "src");
export var doctmp = path.join(srcPath, "_doctmp.ts").replace(/\\/g, '/');
export var doctmp_text = ""
export const {
  service: langService,
  host: langHost,
  updateFile,
} = getLanguageService(commandLine, { [doctmp]: doctmp_text });

export function findMark(markName: string) {
  return doctmp_text.indexOf('/*' + markName + '*/')
}

export function updateDocTmp(content: string) {
  updateFile(doctmp, content)
  doctmp_text = content
}

export const packageJSON = JSON.parse(fs.readFileSync(path.join(__dirname, "../../package.json"), "utf-8"))

export const projectInfo = (function () {
  var gitver = child_process.execSync("git rev-parse HEAD").toString().substr(0, 8)
  var gitClean = child_process.execSync("git diff-index HEAD --").toString().trim().length == 0
  return {
    version: packageJSON.version,
    git: gitver,
    gitClean,
  }
})()
