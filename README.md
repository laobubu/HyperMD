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
 6. **[And More...](https://laobubu.net/hypermd/docs "HyperMD Documentation")**

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
    // keyMap: "vim",     // just for fun

    foldGutter: true,
    gutters: [
        "CodeMirror-linenumbers",
        "CodeMirror-foldgutter",
        "HyperMD-goback"  // (addon: click) 'back' button for footnotes
    ],
    extraKeys: {
        "Enter": "newlineAndIndentContinueMarkdownList"
    },

    // (addon) cursor-debounce
    // cheap mouse could make unexpected selection. use this to fix.
    hmdCursorDebounce: true,
    
    // (addon) fold
    // turn images and links into what you want to see
    hmdAutoFold: 200,

    // (addon) fold-math
    // MathJax support. Both `$` and `$$` are supported
    hmdFoldMath: {   
        interval: 200,      // auto folding interval
        preview: true       // providing a preview while composing math
    },

    // (addon) click
    // (dependencies) addon/readlink
    // follow links and footnotes
    hmdClick: {
      backButton: true  // display "back" button after click a footref
    }
})

// (addon) hide-token
// hide/show Markdown tokens like `**`
editor.hmdHideTokenInit()

// (addon) hover
// (dependencies) addon/readlink
// a tooltip showing footnotes
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
[RequireJS]:  http://requirejs.org/   A JavaScript AMD module loader.
[MathJax]:  https://www.mathjax.org/  A JavaScript display engine for mathematics.
[laobubu]:  https://laobubu.net/  The author of HyperMD.
[^1]: Ctrl+Click works too, but will jump to the footnote if exists.
[^2]: Languages as many as CodeMirror supports.
[^3]: If the theme is not designed for HyperMD, some features might not be present.
