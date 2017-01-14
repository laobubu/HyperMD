# HyperMD

![HyperMD Markdown Editor](./demo/logo.png)

**Breaks the Wall** between *writing* and *preview*, in a Markdown Editor.

## Why use HyperMD ?

HyperMD is a set of [CodeMirror] addons / modes / themes.
You may use both original CodeMirror and HyperMD on the same page.

 1. Write, and preview on the fly
     - **Strong**, *Emphasis*, ~~Strikethrough~~, `Code`
     - [Links](https://laobubu.net), Images, Footnotes
     - Block-quotes, code blocks
     - Headers
     - Horizontal Rules
     - Lists (nested, ordered, unordered, tasks with checkbox)
 2. **Alt+Click** to follow link / footnote [^1]
 3. **Syntax Highlight** for 120+ languages code blocks [^2]
 4. **Hover** to read footnotes
 5. **Massive CodeMirror Addons** can be loaded, including:
     - VIM/Emacs mode and Configurable keybindings
     - Diff and Merge
     - Fullscren
     - Themes [^3]
 6. **[And More...](https://laobubu.net/hypermd/docs)**

## Quickstart

[RequireJS] is recommended and used during developing HyperMD.
You may just open `index.js` and copy partial code. 
Don't forget HTML `<link>` tags to the HyperMD css files.

If you don't want to use [RequireJS], insert `<script>` , `<link>`
and other tags manually. Load HyperMD after CodeMirror, before 
initializing your editor. You might need these files:

 * CodeMirror:
 	- **codemirror.js** and **codemirror.css**
 	- **markdown, gfm, xml, meta** modes from CodeMirror
 	- **addon/mode/overlay** from CodeMirror
 	- (optional) other CodeMirror modes that code highlighting uses
 * HyperMD:
 	- **mode/hypermd** both js and css
 	- **all addons**
 	- **one theme** css file ( eg. `hypermd-light` )

Once addons and stylesheets are loaded, you may initialize editor,
turning your `<textarea>` into HyperMD editor, with few codes:

```javascript
var myTextarea = document.getElementById('input-area')
var editor = CodeMirror.fromTextArea(myTextarea, {
  lineNumbers: true,
  lineWrapping: true,
  theme: "hypermd-light",
  mode: "text/x-hypermd",
  extraKeys: {
    "Enter": "newlineAndIndentContinueMarkdownList"
  }
})

editor.hmdHideTokenInit()
editor.hmdClickInit()
editor.hmdHoverInit()
```

And that's all. Feel free to modify the options above.

## Contributing

HyperMD is a personal Open-Source project by [laobubu].
Contributions are welcomed. You may:

 - [Fork on GitHub](https://github.com/laobubu/hypermd/) , create your amazing themes and addons.
 - [Buy me a Coffee](https://laobubu.net/donate.html)
 - Spread HyperMD to the world!

[CodeMirror]: https://codemirror.net/   a powerful text editor for the browser.
[RequireJS]:  http://requirejs.org/   an JavaScript AMD module loader.
[laobubu]: https://laobubu.net/  the author of HyperMD
[^1]: Ctrl+Click works too, but might jump to the footnote if exists.
[^2]: Languages as many as CodeMirror supports.
[^3]: If the theme is not designed for HyperMD, some features will not be present.
