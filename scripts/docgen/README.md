# HyperMD Doc Generator

Part of [HyperMD](https://github.com/laobubu/hypermd/) project

**Usage** : `npm run build-doc` -- Generate all auto-docs

## Core Files

* **index** : load all doc generators / maker functions, run and save output into files
* **base** : create TypeScript compiler host and Language Service
* **strUtil**
* **genUtil** : generate Markdown text
* **tsUtil** : read info from `ts.SourceFile`s

## Auto-Docs

See *index.ts*

## Dev

Use VSCode to develop and debug. In HyperMD workspace, create `.vscode/launch.json`:

```js
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Run and Debug DocGen",
      "runtimeExecutable": "npm",
      "runtimeArgs": [
        "run",
        "debug:build-doc"
      ],
      "port": 31282
    }
  ]
}
```

Then... Go to Debug Panel and start `Run and Debug DocGen` to debug a script
