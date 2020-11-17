var is_running_demo = /\.github\.|laobubu\.net|(localhost|127\.0\.0\.1)/.test(
  location.hostname
);

var demo_page_baseurl = window.location.href
  .replace(/[\?\#].*$/, "")
  .replace(/\/[^\/]+$/, "/");
var demo_page_lib_baseurl = is_running_demo
  ? "https://cdn.jsdelivr.net/npm/"
  : demo_page_baseurl + "node_modules/";
var demo_filename = "README.md";

if (requirejs)
  requirejs.config({
    // baseUrl: "node_modules/",                   // using local version
    // baseUrl: "https://cdn.jsdelivr.net/npm/",   // or use CDN
    baseUrl: demo_page_lib_baseurl,

    paths: {
      // HyperMD is not from node_modules nor CDN:
      // "hypermd": "./",
      hypermd: demo_page_baseurl + ".",
      "Raphael": "raphael", // adapt flowchart.js bug
    },

    // Remove this line if you occur errors with CDN
    packages: requirejs_packages, // see: requirejs_packages.js

    waitSeconds: 15,
  });

require([
  ///////////////////////////////////////
  /// Core! Load them first!          ///
  ///////////////////////////////////////

  "codemirror/lib/codemirror",
  "hypermd/core",

  /////////////////////////////////////////////
  /// 0xGG Team added following modules    ////
  /////////////////////////////////////////////
  "hypermd/preview/index",
  "hypermd/widget/index",
  "hypermd/addon/emoji/index",
  "hypermd/theme/index",

  ///////////////////////////////////////
  /// CodeMirror                      ///
  ///////////////////////////////////////

  // showHint
  "codemirror/addon/hint/show-hint",

  // Code Highlighting
  "codemirror/mode/htmlmixed/htmlmixed", // for embedded HTML
  "codemirror/mode/stex/stex", // for Math TeX Formular
  "codemirror/mode/yaml/yaml", // for Front Matters

  // NOTE: For code blocks,
  //       addon "mode-loader" can load modes automatically if configured properly
  "codemirror/mode/javascript/javascript", // eg. javascript

  ///////////////////////////////////////
  /// HyperMD modules                 ///
  ///////////////////////////////////////

  "hypermd/mode/hypermd", // ESSENTIAL

  "hypermd/addon/hide-token",
  "hypermd/addon/cursor-debounce",
  "hypermd/addon/fold",
  "hypermd/addon/fold-link",
  "hypermd/addon/fold-image",
  "hypermd/addon/fold-math",
  "hypermd/addon/fold-html",
  "hypermd/addon/fold-widget", // 👈 0xGG
  "hypermd/addon/fold-emoji",
  "hypermd/addon/read-link",
  "hypermd/addon/click",
  "hypermd/addon/hover",
  "hypermd/addon/paste",
  "hypermd/addon/insert-file",
  "hypermd/addon/mode-loader",
  "hypermd/addon/table-align",

  "hypermd/keymap/hypermd",

  /////////////////////////////////////////////
  /// PowerPack with third-party libraries  ///
  /////////////////////////////////////////////

  // "hypermd/powerpack/fold-emoji-with-emojione",

  /////////////////////////////////////////////
  /// 0xGG Team added following folds      ////
  /////////////////////////////////////////////
  "hypermd/powerpack/fold-code-with-mermaid",
  "hypermd/powerpack/fold-code-with-plantuml",
  "hypermd/powerpack/fold-code-with-echarts",
  "hypermd/powerpack/fold-code-with-wavedrom",
  "hypermd/powerpack/fold-code-with-flowchart",

  // 'hypermd/powerpack/fold-emoji-with-twemoji',

  "hypermd/powerpack/insert-file-with-smms",

  "hypermd/powerpack/hover-with-marked",

  "hypermd/powerpack/fold-math-with-katex",
  // 'hypermd/powerpack/fold-math-with-mathjax',

  "hypermd/powerpack/paste-with-turndown",
  "turndown-plugin-gfm",
], function (CodeMirror, HyperMD, Preview, Widget, Emoji, Theme) {
  ("use strict");
  var myTextarea = document.getElementById("demo");

  // HyperMD magic. See https://laobubu.net/HyperMD/docs/
  var editor = HyperMD.fromTextArea(myTextarea, {
    mode: {
      name: "hypermd",
      hashtag: true, // this syntax is not actived by default
    },

    hmdClick: clickHandler,
    hmdFold: {
      image: true,
      link: true,
      math: true,
      html: true, // maybe dangerous
      emoji: true,
      widget: true,
      code: true,
    },

    inputStyle: "contenteditable",
  });
  editor.setSize(null, "100%"); // set height
  editor.on("imageClicked", (args) => {
    args.breakMark(args.editor, args.marker);
  });
  editor.on("linkIconClicked", (args) => {
    args.breakMark(args.editor, args.marker);
  });
  editor.on("imageReadyToLoad", (args) => {
    args.element.src = args.element.getAttribute("data-src");
  });

  // for debugging
  window.CodeMirror = CodeMirror;
  window.HyperMD = HyperMD;
  window.editor = editor;
  window.cm = editor;
  window.Preview = Preview;
  window.Widget = Widget;
  window.Emoji = Emoji;
  window.Theme = Theme;

  const styleID = "codemirror-cursor-style";
  let style = document.getElementById(styleID);
  if (!style) {
    style = document.createElement("style");
    style.id = styleID;
    document.body.appendChild(style);
  }
  style.innerText = `
.CodeMirror-cursor.CodeMirror-cursor {
  border-left: 2px solid rgba(74, 144, 226, 1);
}    
`;

  // Set theme
  const defaultThemeName = localStorage.getItem("settings/themeName") || "dark";
  Theme.setTheme({
    editor: editor,
    themeName: defaultThemeName,
    baseUri: "http://127.0.0.1:8000/theme/",
  });
  const themeSelector = document.getElementById("theme-selector");
  themeSelector.value = defaultThemeName;
  themeSelector.addEventListener("change", (event) => {
    themeSelector.value = event.target.value;
    Theme.setTheme({
      editor: editor,
      themeName: themeSelector.value,
      baseUri: "http://127.0.0.1:8000/theme/",
    });
    localStorage.setItem("settings/themeName", themeSelector.value);
    editor.refresh();
  });

  // for demo page only:
  document.body.className += " loaded";
  document.getElementById("loadSplash").setAttribute("style", "display:none");

  load_and_update_editor(demo_filename);

  // Preview Tex Math formula
  // @see demo/math-preview.js
  init_math_preview(editor);

  // Watch editor and generate TOC
  // @see demo/toc.js
  init_toc(editor);

  // @see demo/lab.js
  init_lab(editor);

  editor.on("change", (instance, changeObject) => {
    if (changeObject.text.length === 1 && changeObject.text[0] === "/") {
      const aheadStr = editor
        .getLine(changeObject.from.line)
        .slice(0, changeObject.from.ch + 1);
      if (!aheadStr.match(/#[^\s]+?\/$/)) {
        editor.showHint({
          closeOnUnfocus: false,
          completeSingle: false,
          hint: () => {
            const cursor = editor.getCursor();
            const token = editor.getTokenAt(cursor);
            const line = cursor.line;
            const lineStr = editor.getLine(line);
            const end = cursor.ch;
            let start = token.start;
            if (lineStr[start] !== "/") {
              start = start - 1;
            }
            const currentWord = lineStr.slice(start, end).replace(/^\//, "");

            const commands = [
              {
                text: "# ",
                displayText: `/h1 - Insert header 1`,
              },
              {
                text: "## ",
                displayText: `/h2 - Insert header 2`,
              },
              {
                text: "### ",
                displayText: `/h3 - Insert header 3`,
              },
            ];
            const filtered = commands.filter(
              (item) =>
                item.displayText
                  .toLocaleLowerCase()
                  .indexOf(currentWord.toLowerCase()) >= 0
            );
            return {
              list: filtered.length ? filtered : commands,
              from: { line, ch: start },
              to: { line, ch: end },
            };
          },
        });
      }
    }
  });
}, function (err) {
  var div = document.getElementById("loadErrorSplash");
  var ul = document.getElementById("loadErrorList");

  div.style.display = "";
  var mods = err.requireModules;
  for (var i = 0; i < mods.length; i++) {
    var li = document.createElement("li");
    li.textContent = mods[i];
    ul.appendChild(li);
  }
});

var demoPageConfig = {
  directOpen: /directOpen/.test(window.location.search),
  mathPreview: true,
};

function clickHandler(info, cm) {
  if (info.type === "link" || info.type === "url") {
    var url = info.url;
    if (
      (demoPageConfig.directOpen || info.ctrlKey || info.altKey) &&
      !/^http/i.test(url) &&
      /\.(?:md|markdown)$/.test(url.replace(/[?#].*$/, ""))
    ) {
      // open a link whose URL is *.md with ajax_load_file
      // and supress HyperMD default behavoir
      load_and_update_editor(url); // see index2.js
      return false;
    } else if (demoPageConfig.directOpen && url) {
      window.open(url);
      return false;
    } else if (/^\[(?:Try out|试试看)\]$/i.test(info.text)) {
      demo_tryout(info); // see index2.js
      return false;
    }
  }
  if (info.type === "hashtag") {
    var msg = "You clicked a hashtag";
    if (info.ctrlKey) msg += " (with Ctrl)";
    if (info.altKey) msg += " (with Alt)";
    console.log(msg, info.text, info.pos);
  }
}
