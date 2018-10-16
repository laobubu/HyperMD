# HyperMD Themes

## Make a Theme

0. Go to `theme` dir
1. Copy `hypermd-light.scss` to `my-theme-name.scss`
2. Open it, change `$theme-name: 'hypermd-light';` to `$theme-name: 'my-theme-name';`
3. `npm run dev-theme my-theme-name`

In your theme .scss file, you may find...

### `$` Variables

Some visual styles are defined via global variables. You can override them.

Full list can be found in `./base/defaults.scss`

### `%` Placeholder Selectors

To make a CodeMirror editor WYSIWYG, lots of subtle ~~, messy and too-hard-to-understand~~ techniques are applied.

**The placeholder selectors are just aliases**, to shield you from the obscure selector bombs. Of course, for curious and adventurous you, `./base/compose.scss` is always waiting for you...

### Regular Selectors

Not every element has alias (placeholder selector), if the selector expression is intelligible enough.

**NOTICE**: Regular Selectors MUST BE prefixed, or wrapped by `%editor`. example: `%editor img.hmd-image`

The common patterns are:

- `.cm-???` and `span.cm-???` -- inline spans. Could be text, markups or marker icons.
  - `cm-formatting-???` -- spans for formatting tokens like `**`, `~~` and `$`
  - `&.hmd-hidden-token` -- spans that are **hidden** by addon/hide-token. maybe you don't need to care about them. most of them are formatting tokens.
- `pre.HyperMD-???` -- lines of Markdown text. The element may contains rendered things like images and formulas.
  - `&.hmd-inactive-line` -- if the caret is not in that line, you may make the line preview-like. Eg. for headers, hide the hash symbols, for quotes, hide the `>` s.

## Technical Details

### hover (aka. Tooltip)

This is for **addon/hover**. It displays a tooltip when cursor is hovering on a footnote-ref like [^this]. Basically it shall look like this:

```
+---------------------------+
| https://laobubu.net       |       <--- .HyperMD-hover-content
+----------. .--------------+
            V                       <--- .HyperMD-hover-indicator
Lorem ipsue [dollar] foobar...
```

Both `.HyperMD-hover-content` and `.HyperMD-hover-indicator` are wrapped by a `div.HyperMD-hover` (call it the parent node)

```html
<div style="position: absolute; z-index: 99; left: -39.5938px; top: 271.344px;" class="HyperMD-hover" cm-ignore-events="true">
  <div class="HyperMD-hover-content">The content</div>
  <div class="HyperMD-hover-indicator" style="margin-left: 219.813px;"></div>
</div>
```

The offset position of the parent node and the `margin-left` of `.HyperMD-hover-indicator` are computed by HyperMD:

1. find the position of the target character.
2. set `style.left` of the parent node, and measure its dimension. If it overflows the editor's right edge, re-calc `style.left`.
3. set `style.top` of the parent node.
4. set `style.marginLeft` of the `.HyperMD-hover-indicator` in order to place the indicator above the target character.

Hence, the content and indicator can NOT be absolute-positioned! Otherwise, the 2nd step will not work properly.

### fold-html and fold-html-stub

HyperMD.FoldCode may turn {inline,block} html into real HTML Elements!

#### the `%fold-html-container`

All the rules in `%fold-html-container` apply to the rendered elements.

#### inline html

Here is an example, created from Markdown source `Hey <button>Button in Markdown</button> Lorem Ipsue`

```html
Hey
<span class="CodeMirror-widget" role="presentation" cm-ignore-events="true">
  <span class="hmd-fold-html">
    <span class="hmd-fold-html-stub omittable">&lt;HTML&gt;</span>
    <button class="hmd-fold-html-inline-content">Button in Markdown</button>
  </span>
</span>
Lorem Ipsue
```

The outest `span.CodeMirror-widget` is created by CodeMirror, which has nothing to do with your styling. You shall just ignore it.

The `span.hmd-fold-html` extends `%fold-html-container`

The rendered element always has className `hmd-fold-html-inline-content`. When the cursor hovers on `span.hmd-fold-html`, you may add an outline to it.

The `span.hmd-fold-html-stub` is just a stub marker.

When the rendered element is inline, the stub may become `span.hmd-fold-html-stub.omittable`.
Otherwise, if the rendered element leaves the line flow (eg. `float: left` or `position: absolute`), the stub will never have the `omittable` className.

A *omittable* stub may float above the rendered element. It may also be invisible unless the cursor is hovering on the rendered element.

**One more thing**, `.hmd-fold-html-stub:hover` and `.hmd-fold-html-stub.highlight` shall have the same style!

#### block html

In a Markdown file, if a paragraph is pure HTML (from the first character to the last character), it may be rendered as block html. A block html is composed by two parts:

1. A stub marker that folds the HTML source code.
2. A CodeMirror LineWidget below the stub marker.

The inline stub marker looks like this:

```html
<span class="CodeMirror-widget" role="presentation" cm-ignore-events="true">
  <span class="hmd-fold-html">
    <span class="hmd-fold-html-stub">&lt;HTML&gt;</span>
  </span>
</span>
```

And the LineWidget:

```html
<div class="CodeMirror-linewidget" cm-ignore-events="true">
  <div class="hmd-fold-html-block-content-outside">
    <summary class="hmd-fold-html-block-content">
      The answer of life is
      <details>42</details>
    </summary>
  </div>
</div>
```

When cursor hovers on the LineWidget, the stub marker gets `.highlight` className.

The `div.hmd-fold-html-block-content-outside` applies the line padding to the rendered element.

The `div.hmd-fold-html-block-content-outside` extends `%fold-html-container`.
Therefore, in most cases, you **don't need to specially stylish** anything in LineWidget.


### fold-code and fold-code-stub

TL;DR. fold-code doesn't need styling.

Things about `fold-code` is like *block html* of `fold-html`.

Let's say you have a code block with language *foobar*, and it may be folded/rendered into a `<img>`. HyperMD creates a LineWidget and a inline stub marker.

```html
<div class="CodeMirror-linewidget" cm-ignore-events="true">
  <div class="hmd-fold-code-content hmd-fold-code-foobar" style="min-height: 1em;">
    <img src="blob:generated_image">
  </div>
</div>
```

```html
<span class="CodeMirror-widget" role="presentation" cm-ignore-events="true">
  <span class="hmd-fold-code-stub hmd-fold-code-foobar">&lt;CODE&gt;</span>
</span>
```

Where `.hmd-fold-code-stub` shares the same style of `.hmd-fold-html-stub`. Therefore...

**CONCLUSION**: fold-code doesn't need styling.
