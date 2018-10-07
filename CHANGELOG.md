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

You can put HTML directly into your Markdown (without the code block fence).
DON'T PUT `iframe` INTO YOUR Markdown! Once DOM changes (which is often), the iframes will reload!


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

## 0.3.7  2018-7-2

*Introducing hashtags and emojis! Can anyone tell me how to popularize HyperMD?*
*哎呀实习机会貌似黄了啊！而且这个项目又无人问津了啊？*

* **Fix**
  * **mode**
    + Adjacent headers, the latter was not correctly styled
    + Wrong behavoir at links whose text contains line break
  * **addon/fold-html**: stop eating extra blank lines
  * **addon/fold**: if marked (aka. folded) text changed, corresponding FolderFunc will be re-called.

* **Removed**
  * **addon/fold**: editor option `hmdFold` will no longer accept `customFolders`.
    Please use the new method *registerFolder*.

* **Add**
  * **core**
    * **normalVisualConfig**: addons that make visual effects, shall update `HyperMD.normalVisualConfig`
      in order to make `HyperMD.switchToNormal(editor)` work properly.
      (eg. _HideToken_ `hmdHideToken` shall be `false` when switching to normal mode)
  * **mode**
    * **Hashtag** syntax! People #hashtag #everything in life# (disabled by default)
    * **TOC Placeholder** supports `[TOC]` and `[TOCM]` mark
  * **addon/click**:
    - Clicking on hashtags now trigs the _ClickHandler_
    - ClickInfo: new _TargetType_: `"hashtag"`
  * **addon/fold**: module now exports new method *registerFolder*
    * *Declaration*: `registerFolder(name, folderFunc, isSuggested)`
    * To use custom folders:
      1. `registerFolder("my_folder", myFolderFunc, false)`
      2. enable *my_folder* via editor option `hmdFold`
    * In plain browser env, it's defined as `HyperMD.Fold.registerFolder`
  * **addon/fold-emoji**: fold emoji marks :smile:
  * **powerpack**
    + fold-emoji-with-emojione
    + fold-emoji-with-twemoji

* **Other**
  * English fundamental docs are now published within NPM package.
  * Documentation is much more friendly.
  * Theme hypermd-light refined.

## 0.3.8  2018-7-2

*Minor Fix for Fold addon!*
*哎哟毒奶奶到了机会！*

* **Fix**
  * **addon/fold**: folding not work if multi lines inserted

## 0.3.9 2018-7-4

*Now you can insert diagrams into your documentation. And fix a addon/fold bug*
*终于能插流程图和各种图了。顺便悄悄修复了一个 Fold 相关的bug。*

* **Fix**
  * **addon/fold**: ...
  * **mode/hypermd**: process TeX formula when sTeX mode missing

* **Add**
  * [More examples](https://laobubu.net/HyperMD/docs/examples/index.html)
  * **addon/fold-code**: turn code blocks into flow charts / playground sandboxes etc.
  * **powerpack**
    + fold-code-with-flowchart
    + fold-code-with-mermaid

## 0.3.10 2018-7-21

*A project can be stable only if tested by people.*
*早茶与冰室的甜品真是美滋滋的东西*

* **Fix**
  * [style] Use another way to hide tokens. Fix #38
  * [theme] Apply monospace font to formatting tokens and urls
  * [powerpacks] Remove typing file references. Fix #37
  * [keymap] Default key for Mac. by @michaelgmcd

* **Add**
  * **Goods** some interesting and optional modules/patches
    - **patch-requirejs** Patch RequireJS so that you can import css files directly.
    - **complete-emoji** Auto complete emoji codes.
    - [more will be documented here](./docs/goods.md)

## 0.3.11 2018-10-7

*The last version of 0.3.x. User experience is improved a lot. Since 0.4.x, PowerPacks will be provided as separated NPM packages. See you soon.*
*秋招真是奇妙的事情。不知道收假后哪家公司会先开奖。从 0.4.x 版本开始把 PowerPacks 拆分出去，不然每次默认 NPM 安装都会带来一堆全家桶。啊对了还有烦人的毕设要做。*

* **Add**
  - `requestRange` of `addon/fold` now accept 2 or 4 arguments
    - You may optionally provide a range. If caret is inside it, HyperMD will unfold your marker.
    - *Application*: `fold-link` reveal the URL when user edits the link text. This is useful!
  - Separate `fold-image` and `fold-link` from the `fold` core addon
  - Add `LineSpanExtractor` into core
  - Rewritten `addon/hide-token`
    1. When editing a nested span (eg. [**Bold Link**](https://laobubu.net)), all related token (`[` `]` and `**`) will be displayed
    2. Based on LineSpanExtractor-parsed data. Faster and smarter.
    3. Don't hide tokens if they are affected by user selection.

* **Fix**
  - Clean some code about TokenSeeker
  - **addon/table-align**: unstable width in Chrome
  - **addon/insert-file**: if clipboard only has one image which is copied from a webpage, this shall be handled by **addon/paste**
