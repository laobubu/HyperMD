# HyperMD

![HyperMD Markdown Editor](./demo/logo.png)

**Breaks the Wall** between *writing* and *preview*, in a Markdown Editor.

[Online Demo](https://demo.laobubu.net)

## Why use HyperMD?

HyperMD is a set of [CodeMirror] add-ons / modes / themes.
<!-- http://english.stackexchange.com/questions/50319/add-in-addin-add-on-addon -->
You may use both original CodeMirror and HyperMD on the same page.

 1. Write, and preview on the fly
     - **Strong**, *Emphasis*, ~~Strikethrough~~, `Code`
     - [Links](https://laobubu.net), Images, Footnotes
     - Block-quotes, code blocks
     - Headers
     - Horizontal Rules
     - Lists (nested, ordered, unordered, tasks with checkbox)
     - [MathJax] Formula, like $ e^{ i\pi } + 1 = 0 $ and math block [^4]
 2. **Alt+Click** to follow link / footnote [^1]
 3. **Syntax Highlight** for 120+ languages code blocks [^2]
 4. **Hover** to read footnotes
 5. **Copy and Paste**, translate HTML into Markdown [^5]
 6. **Massive CodeMirror Add-ons** can be loaded, including:
     - VIM/Emacs mode and Configurable keybindings
     - Diff and Merge
     - Fullscreen
     - Themes [^3]
 7. **[And More...](https://laobubu.net/hypermd/docs "HyperMD Documentation")**

## Quickstart

[RequireJS] is recommended and used during developing HyperMD.
You may just open `index.js` and copy partial code.
Don't forget HTML `<link>` tags to the CSS files.

If you don't want to use [RequireJS], insert `<script>` , `<link>`
and other tags manually. Load these files **in sequence**, before
initializing your editor:

 * CodeMirror:
 	- **codemirror.js** and **codemirror.css**
 	- **addon/mode/overlay.js** from CodeMirror
 	- **addon/edit/continuelist.js** from CodeMirror
 	- **meta, XML, markdown, GFM** modes from CodeMirror
 	- (optional) other CodeMirror modes if you need code highlighting
 * HyperMD:
 	- **mode/hypermd** both js and CSS
 	- **all add-ons**
 	- **theme** you prefer ( eg. `hypermd-light.css` )

Once add-ons and stylesheets are loaded, you may initialize editor,
turn your `<textarea>` into HyperMD editor, with few codes:

***Note**: This complex approach is temporary. but don't worry,*
*Some easy-to-use functions (methods) will come in a new version.*

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
    },

    hmdHideToken: "(profile-1)",
    hmdCursorDebounce: true,
    hmdAutoFold: 200,
    hmdPaste: true,
    hmdFoldMath: { interval: 200, preview: true }
})

editor.hmdHoverInit()       // tooltips on footnotes
editor.hmdClickInit()       // click to follow links and footnotes
```

And that's all. Feel free to the options above.

## Contributing

HyperMD is a personal Open-Source project by [laobubu].
Contributions are welcomed. You may:

 - [Fork on GitHub](https://github.com/laobubu/hypermd/) , create your amazing themes and add-ons.
 - [Buy me a Coffee](https://laobubu.net/donate.html)
 - Spread HyperMD to the world!



-------------------------------------------------------
[CodeMirror]: https://codemirror.net/   A powerful text editor for the browser.
[RequireJS]:  http://requirejs.org/   A JavaScript AMD module loader.
[MathJax]:  https://www.mathjax.org/  A JavaScript display engine for mathematics.
[laobubu]:  https://laobubu.net/  The author of HyperMD.
[^1]: Ctrl+Click works too, but will jump to the footnote if exists.
[^2]: Languages as many as CodeMirror supports.
[^3]: If the theme is not designed for HyperMD, some features might not be present.
[^4]: Math block is just like code block. Use `$$` to wrap your math expression.
[^5]: Use `Ctrl+Shift+V` to paste plain text.
