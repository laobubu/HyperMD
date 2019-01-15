# HyperMD goods

These are interesting and optional modules/patches. In most cases, you might not need them.

All goods are placed in `goods` directory. You can access them via `path_to_hypermd/goods/xxxxxxx.js`.







## patch-requirejs

Patch RequireJS so that you can `require` css files directly.

✨ **Usage**

1. Load RequireJS via a `<script>` tag
2. Load this patch via a `<script>` tag
3. Use RequireJS




## complete-emoji

Provides auto-complete support for emojis. [Demo Here](./examples/custom-emoji.html)

⚠️ **Experimental Warning**

This module is currently experimental.

✨ **Usage**

First of all, you have to import this module.
`const CompleteEmoji = require("hypermd/goods/complete-emoji")`
*(If is in plain browser env, all you need is to include the `<script>` tag)*

Then, add these options to your HyperMD `editor`:

```js
// Emoji AutoComplete config
extraKeys: {
  "Ctrl-Space": "autocomplete",   // Use Ctrl+Space to
},
hintOptions: {
  hint: CompleteEmoji.createHintFunc()
},
```

Optionally, you can show the auto-complete box when user inputs a colon `:`

```js
// show AutoComplete when ":" is inputed
editor.on("inputRead", function (cm, change) {
  if (change.text.length === 1 && change.text[0] === ':') editor.showHint()
})
```
