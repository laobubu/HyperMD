# HyperMD Themes

## How to make one?

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
  - `&.hmd-hidden-token` -- spans **hidden** by addon/hide-token. Eg. `**` for **bold**, `~~` for ~~deleted~~
- `pre.HyperMD-???` -- lines of Markdown text. The element may contains rendered things like images and formulas.
  - `&.hmd-inactive-line` -- if the caret is not in that line, you may make the line preview-like. Eg. for headers, hide the hash symbols, for quotes, hide the `>` s.

