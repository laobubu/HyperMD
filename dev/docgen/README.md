# HyperMD Doc Generator

Part of [HyperMD](https://github.com/laobubu/hypermd/) project

**Usage** : `npm run build_doc` -- Generate all auto-docs

## Core Files

* **index** : load all doc generators / maker functions, run and save output into files
* **base** : create TypeScript compiler host and Language Service
* **strUtil**
* **genUtil** : generate Markdown text
* **tsUtil** : read info from `ts.SourceFile`s

## Auto-Docs

See *index.ts*

## Dev

Use VSCode to develop and debug. Open this directory ( dev/docgen ) as the workspace and create `.vscode/launch.json`:

```js
{
    "version": "0.2.0",
    "configurations": [
        {
            "type": "node",
            "request": "launch",
            "name": "Run DocGen Script",
            "program": "${fileDirname}/../tmp/${fileBasenameNoExtension}.js",
            "outFiles": [
                "${fileDirname}/../tmp/${fileBasenameNoExtension}.js"
            ]
        }
    ]
}
```

Then...

1. Run in terminal: `npx tsc -w`
2. Files will be compiled into `../tmp` dir and updated automatically
3. Press `F5` to debug a script
