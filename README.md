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
     - [MathJax] Formula like $ e^{ i\pi } + 1 = 0 $
 2. **Alt+Click** to follow link / footnote [^1]
 3. **Syntax Highlight** for 120+ languages code blocks [^2]
 4. **Hover** to read footnotes
 5. **Massive CodeMirror Addons** can be loaded, including:
     - VIM/Emacs mode and Configurable keybindings
     - Diff and Merge
     - Fullscren
     - Themes [^3]
 6. **[And More...][HyperMD-Doc]**

## Quickstart

[RequireJS] is recommended and used during developing HyperMD.
You may just open `index.js` and copy partial code. 
Don't forget HTML `<link>` tags to the css files.

If you don't want to use [RequireJS], insert `<script>` , `<link>`
and other tags manually. Load these files **in sequence**, before 
initializing your editor:

 * CodeMirror:
 	- **codemirror.js** and **codemirror.css**
 	- **addon/mode/overlay.js** from CodeMirror
 	- **addon/edit/continuelist.js** from CodeMirror
 	- **meta, xml, markdown, gfm** modes from CodeMirror
 	- (optional) other CodeMirror modes if you need code highlighting
 * HyperMD:
 	- **mode/hypermd** both js and css
 	- **all addons**
 	- **theme** you prefer ( eg. `hypermd-light.css` )

Once addons and stylesheets are loaded, you may initialize editor,
turning your `<textarea>` into HyperMD editor, with few codes:

```javascript
var myTextarea = document.getElementById('input-area')
var editor = CodeMirror.fromTextArea(myTextarea, {
  lineNumbers: true,
  lineWrapping: true,
  theme: "hypermd-light",
  mode: "text/x-hypermd",
  gutters: [
    "CodeMirror-linenumbers",
    "HyperMD-goback"
  ],
  extraKeys: {
    "Enter": "newlineAndIndentContinueMarkdownList"
  }
})

editor.hmdHideTokenInit()
editor.hmdHoverInit()
```

And that's all. Feel free to modify the options above.

## Contributing

HyperMD is a personal Open-Source project by [laobubu].
Contributions are welcomed. You may:

 - [Fork on GitHub](https://github.com/laobubu/hypermd/) , create your amazing themes and addons.
 - [Buy me a Coffee](https://laobubu.net/donate.html)
 - Spread HyperMD to the world!

-------------------------------------------------------
[CodeMirror]: https://codemirror.net/   A powerful text editor for the browser.
[RequireJS]:  http://requirejs.org/   An JavaScript AMD module loader.
[MathJax]:  https://www.mathjax.org/  A JavaScript display engine for mathematics.
[laobubu]:  https://laobubu.net/  The author of HyperMD.
[HyperMD-Doc]:  https://laobubu.net/hypermd/docs  The HyperMD Documentation.
[^1]: Ctrl+Click works too, but will jump to the footnote if exists.
[^2]: Languages as many as CodeMirror supports.
[^3]: If the theme is not designed for HyperMD, some features will not be present.
