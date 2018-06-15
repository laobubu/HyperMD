# ChangeLog

## 0.3.0 2018-5-21

This Was A Triumph, I'm Making A Note Here: HUGE SUCCESS!
赶鸭子上架地发布了，我就在这里瞎写一通吧：还是没有实习机会！

Documentation will get online <https://laobubu.net/HyperMD/docs/> someday, if someone is willing to help.
文档等回头再看情况吧，还有一堆坑没填的我心力憔悴。

## 0.3.4 2018-6-12

*(This part covers v0.3.1~v0.3.4)*
*（果然还是没人看啊）*

### Feature: KeyMap

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

### Feature: Table

| Item | Description |
| :------- | :-------: |
| addon *table-align* | Display table correctly. |
| *HyperMD mode*  | Parse table tokens |
| Column Alignment  | experimental  |

### Feature: Fold-HTML (addon)

Note: This feature could be **dangerous**. If you want to use this, enable it manually via *editor option*

<iframe width="560" height="315" src="https://www.youtube.com/embed/QH2-TGUlwu4?rel=0" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>


### Project Structure

+ **Bundler First!**
  + Require CSS via JavaScript
    + If using RequireJS, apply this [patch](./demo/patch-requirejs.js) before loading modules.
  + Plain browser env is still supported. [See demo](./docs/examples/ai1.html)

+ **PowerPack** utilize third-party libs.
  *HyperMD now has no third-party dependency except `codemirror`*

  - fold-math-with-**katex**
  - fold-math-with-**mathjax**
  - hover-with-**marked**
  - paste-with-**turndown**

+ **Auto Generated Doc** for addons
  - See [docs](./docs)
  - Addons **must** follow the *skeleton* template

+ **New Build Configuration and Script**
  + See *dev/HyperMD.config.js*
  + Use TypeScript to emit files, then use `dev/post-build.js` to fix their UMD problems.

### Other

- Fix bugs

## 0.3.5 2018-06-14

*This is a literally minor update. Enjoy (if anyone is using this).*
*未曾想到这又是一出没人看的独角戏，随缘吧（啊想去成都吃冒菜）*

* **New Features**
  * [Mode] Support YAML Front Matter
  * [KeyMap] no indentation for new lines after MathBlock
  * [Mode] Stop requiring unnecessary CodeMirror modes

* **Fix**
  * `insert-file` not work with Drag'n'Drop

* **Appearance**
  * Improve block-quote experience
  * Slightly increased font-size
  * [Demo Page] TOC & MathPreview

## 0.3.6  2018-6-15

*Many sorry for webpack users, and ~~crazy~~ sm.ms lovers. Hope not ruin your day.*
*坑真的是越填越多，又要~~不情愿地~~更新了。至少有人试用了算好消息吧。*

* **Project Structure**
  * **ai1** for plain browser env **ONLY**
  * **everything** for module loaders / bundlers

* **Removed**
  * **insert-file**: Default FileHandler which uses sm.ms, is now depercated.
    You MUST provided your own FileHandler, or use PowerPacks (if it's okay)

* **Appearance**
  * **List** : Fix : an empty line may appear if the first word is too looong

* **Fix**
  * **FoldMath** allow inline `$$ TeX $$` formulars (useful for Jekyll)
  * **UMD Declaration** now works with WebPack. See issue #31
    - *TypeScript UMD format s@@ks!*
  * **Use AMD** module declaration while developing.
  * **Dev/DocGen** exported-member extractor
