# Options for Mode

HyperMD provides a CodeMirror mode `"hypermd"`, which is based on CodeMirror's _markdown_ mode, and supports lots of Markdown syntax extensions.

For example, if your website wants to support #hashtag in Markdown, enable the syntax here so that HyperMD can parse and style the hashtags for you.

Once HyperMD loaded, you may set your CodeMirror editors to _hypermd_ mode.


# ✨ Usage

## While Initializing

Mode is configured in _editor option_.

Both CodeMirror and HyperMD provide a method `fromTextArea` and you may configure hypermd mode there:

```js
var cm = HyperMD.fromTextArea(myTextarea, {
  /* ...other editor options */

  mode: {
    name: "hypermd",

    /* mode options goes here*/
    hashtag: true, // example. enable hashtag
  }
})
```

## During Runtime

Use `setOption` method of the editor instance.

```js
cm.setOption("mode", {
  name: "hypermd",
  /* mode options goes here*/
})
```



# 📕 Mode Options

## front_matter

🎨 **Type**: `boolean`   📦 **Default**: `true`

Parse [YAML frontmatter](http://jekyllrb.com/docs/frontmatter/)


## math

🎨 **Type**: `boolean`   📦 **Default**: `true`

Parse TeX formula wrapped by `$` or `$$`.

🚩 **Example**:

Inline Formula: $\LaTeX$ and $$y=kx+b$$

Display Formula:
$$
\begin{bmatrix}
   \cos \theta       &&     -\sin \theta    \\
   \sin \theta       &&      \cos \theta
\end{bmatrix}
$$

## table

🎨 **Type**: `boolean`   📦 **Default**: `true`

Parse simple Markdown table.

:warning: HyperMD's table syntax is a bit stricter than GitHub Flavored Markdown Spec.

1. Use of leading and trailing pipes **MUST** be consistent. [Example 192](https://github.github.com/gfm/#example-192) of GFM is not supported.

🚩 **Example**:

| table | title   |
| ----- | ----- |
| lorem | ipsue |

table | title
----- | -----
lorem | ipsue


## toc

🎨 **Type**: `boolean`   📦 **Default**: `true`

Style `[TOC]` placeholder.

🚩 **Example**:

[ToC]


## orgModeMarkup

🎨 **Type**: `boolean`   📦 **Default**: `true`

Style orgmode-like markup `#+attribute`. Just **styling**.

🚩 **Example**:

#+Title: HyperMD orgModeMarkup
#+BEGIN_QUOTE
Is there any markdown renderer supports these markups?
Maybe someday I'll make one to generate well-formatted papers :smile:
-- laobubu
#+END_QUOTE



## hashtag

🎨 **Type**: `boolean`   📦 **Default**: `false`

Support #hashtag syntax. This will also make _addon/click_ supports hashtag-clicking events.

🚩 **Example**:

#hypermd #codemirror/markdown #tag with space#



## ... and more

hypermd mode supports [CodeMirror markdown's mode options][cm-markdown] too

----

[cm-markdown]: https://codemirror.net/mode/markdown/index.html
