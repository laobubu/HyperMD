# HyperMD

![HyperMD Markdown Editor](./demo/logo.png)

**Breaks the Wall** between *writing* and *preview*, in a Markdown Editor.

[![NPM version](https://img.shields.io/npm/v/hypermd.svg?style=flat-square)](https://npmjs.org/package/hypermd) [![Build Status](https://travis-ci.org/laobubu/HyperMD.svg?branch=master)](https://travis-ci.org/laobubu/HyperMD)

[Online Demo](https://laobubu.net/HyperMD/)
[中文介绍](./demo/README.zh-CN.md)

## Why use HyperMD?

HyperMD is a set of [CodeMirror] add-ons / modes / themes / commands / keymap etc.

You may use both original CodeMirror and HyperMD on the same page.

1. Write, and preview on the fly
   - **Regular Markdown** blocks and elements
     + **Strong**, *Emphasis*, ~~Strikethrough~~, `Code`
     + [Links](https://laobubu.net), Images
     + Title / Quote / Code Block / List / Horizontal Rule
   - **Markdown Extension**
     + Simple Table
     + Footnote [^1]
     + [x] TODO List (with clickable checkboxes)
     + YAML Front Matter
   - Inline $\LaTeX$ Formula, and multi-line math blocks [^4]
2. **Alt+Click** to follow link / footnote [^1]
3. **Syntax Highlight** for 120+ languages code blocks [^2]
4. **Hover** to read footnotes
5. **Copy and Paste**, translate HTML into Markdown [^5]
6. **Massive CodeMirror Add-ons** can be loaded, including:
   - VIM/Emacs mode and Configurable keybindings
   - Diff and Merge
   - Fullscreen
   - Themes [^3]
7. **Upload Images** and files via clipboard, or drag'n'drop
8. **Power Packs** integrate 3rd-party libs and services on-the-fly
   - [MathJax][], [marked][], KaTeX and more.
   - *[Read the list](https://laobubu.net/HyperMD/#./docs/powerpacks.md)*
9. Tailored **KeyMap** "HyperMD":
    + **Table**
      - <kbd>Enter</kbd> Create a table with `| column | line |`
      - <kbd>Enter</kbd> Insert new row, or finish a table (if last row is empty)
      - <kbd>Tab</kbd> or <kbd>Shift-Tab</kbd> to navigate between cells
    + **List**
      - <kbd>Tab</kbd> or <kbd>Shift-Tab</kbd> to indent/unindent current list item
    + **Formatting** a nearby word (or selected text)
      - <kbd>Ctrl+B</kbd> **bold**
      - <kbd>Ctrl+I</kbd> *emphasis*
      - <kbd>Ctrl+D</kbd> ~~strikethrough~~
10. **[And More...][doc]**

## Quickstart

```javascript
// npm install --save hypermd codemirror
var HyperMD = require('hypermd')
var myTextarea = document.getElementById('input-area')
var editor = HyperMD.fromTextArea(myTextarea)
```

If you use bundlers, that's all. CSS will be imported via "hypermd" javascript.

For [RequireJS][] users and pure HTML lovers, please read [QuickStart Section in Documentation][doc]!

## Special Thanks

💎 **Service and Resource**

<table>
  <tr>
    <td width="50%">
      <b><a href="https://icomoon.io/#icons-icomoon">IcoMoon</a></b> - The IconPack(Free Version)<br>
      <small>
        <em>Demo Page</em> uses IcoMoon icons. Related files are stored in <a href="https://github.com/laobubu/HyperMD/tree/master/demo/svgicon">demo/svgicon</a>.
      </small>
    </td>
    <td>
      <b><a href="http://www.codecogs.com">CodeCogs</a></b> - An Open Source Scientific Library<br>
      <small>
        <em>FoldMath</em> uses codecogs' service as the default TeX MathRenderer.<br>
        (You may load PowerPack to use other renderer, eg. KaTeX or MathJax)
      </small>
    </td>
  </tr>
  <tr>
    <td>
      <b><a href="https://sm.ms/">SM.MS</a></b> - A Free Image Hosting service<br>
      <small>
        <em>Demo Page</em> and <em>PowerPack/insert-file-with-smms</em> use SM.MS open API to upload user-inserted images.<br>
        (If you want to integrate SM.MS service, use the PowerPack)
      </small>
    </td>
    <td>
      <b><a href="https://codemirror.net/">CodeMirror</a></b> - In-browser code editor.<br>
      <b><a href="http://requirejs.org/">RequireJS</a></b> - A JavaScript AMD module loader.<br>
      <b><a href="https://khan.github.io/KaTeX/">KaTeX</a></b> - The fastest math typesetting library for the web.<br>
      <b><a href="https://github.com/chjj/marked/">marked</a></b>,
      <b><a href="https://github.com/domchristie/turndown/">turndown</a></b>
      and more remarkable libs.
      <br>
    </td>
  </tr>
</table>


🙏 **Sponsors** _(sorted by date)_

<div class="sponsors">
  <span>☕Phithon</span>
  <span>☕c*i</span>
  <span>☕*Yuan</span>
</div>


## Contributing

HyperMD is a personal Open-Source project by [laobubu].
Contributions are welcomed. You may:

- [Fork on GitHub](https://github.com/laobubu/HyperMD/) , create your amazing themes and add-ons.
- [Buy me a Coffee](https://laobubu.net/donate.html)
- Spread HyperMD to the world!



-------------------------------------------------------
[CodeMirror]: https://codemirror.net/   A powerful text editor for the browser.
[RequireJS]:  http://requirejs.org/   A JavaScript AMD module loader.
[MathJax]:  https://www.mathjax.org/  A display engine for mathematics.
[marked]:   https://github.com/chjj/marked/  A markdown parser and compiler.
[turndown]: https://github.com/domchristie/turndown An HTML to Markdown converter
[turndown-plugin-gfm]: https://github.com/domchristie/turndown-plugin-gfm Turndown plugin to add GitHub Flavored Markdown extensions
[laobubu]:  https://laobubu.net/  The author of HyperMD.
[doc]: https://laobubu.net/HyperMD/docs/ HyperMD Documentation

[^1]: Ctrl+Click works too, but will jump to the footnote if exists.
[^2]: Languages as many as CodeMirror supports.
[^3]: If the theme is not designed for HyperMD, some features might not be present.
[^4]: Math block use `$$` to wrap your TeX expression.
[^5]: Use `Ctrl+Shift+V` to paste plain text.
