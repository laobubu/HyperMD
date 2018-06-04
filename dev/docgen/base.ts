import * as ts from "typescript"
import * as fs from "fs"
import * as path from "path"

const sys = ts.sys
export const basePath = path.normalize(path.join(__dirname, "../.."));
export const srcPath = path.join(basePath, "src");

function getCommandLine(basePath: string, srcPath: string) {
  const configPath = ts.findConfigFile(basePath, fs.existsSync);
  const parsed = ts.parseConfigFileTextToJson(configPath, sys.readFile(configPath));
  const configParseResult = ts.parseJsonConfigFileContent(parsed.config, sys, srcPath, null, configPath);

  return configParseResult;
}

function getCompileProgram(cl: ts.ParsedCommandLine) {
  const compilerHost: ts.CompilerHost = {
    getSourceFile: (s, v) => {
      const content = sys.readFile(s);
      return content !== undefined ? ts.createSourceFile(s, content, v) : undefined;
    },
    getDefaultLibFileName: () => "lib.d.ts",
    useCaseSensitiveFileNames: () => sys.useCaseSensitiveFileNames,
    writeFile: (f: string, content: string) => { throw new Error("Unexpected operation: writeFile"); },
    getCurrentDirectory: () => srcPath,
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

/** We will create a virtual file to emulate auto-completition! */
export var doctmp = path.join(srcPath, "_doctmp.ts").replace(/\\/g, '/');
export var doctmp_text = ""

export const commandLine = getCommandLine(basePath, srcPath);
export const program = getCompileProgram(commandLine);
export const { service: langService, host: langHost, updateFile } = getLanguageService(commandLine, { [doctmp]: doctmp_text });

export function findMark(markName: string) {
  return doctmp_text.indexOf('/*' + markName)
}

export function updateDocTmp(content: string) {
  updateFile(doctmp, content)
  doctmp_text = content
}
