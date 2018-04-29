/* global editor, CODEMIRROR_ROOT */

// the following code is just for test.
// useless for you.

function click_bind(id, func, event) {
    var btn = document.getElementById(id)
    btn.addEventListener(event || "click", func, false)
}

click_bind("raw_mode", function () {
    editor.setOption('theme', 'default')

    // stop auto folding
    editor.setOption('hmdAutoFold', 0)
    editor.setOption('hmdFoldMath', false)

    // unfold all folded parts
    setTimeout(function () {
        var marks = editor.getAllMarks()
        for (var i = 0; i < marks.length; i++) {
            var mark = marks[i]
            if (/^hmd-/.test(mark.className)) mark.clear()
        }
    }, 200) // FIXME: the timeout is not determined

    // stop hiding tokens
    editor.setOption('hmdHideToken', '')
})

click_bind("hypermd_mode", function () {
    editor.setOption('theme', 'hypermd-light')
    editor.setOption('hmdAutoFold', 200)
    editor.setOption('hmdFoldMath', { interval: 200, preview: true })
    editor.setOption('hmdHideToken', '(profile-1)')
})

!function hideSplash() {
    if (!window.editor) return setTimeout(hideSplash, 100)
    document.getElementById('header').setAttribute('style', 'height:1px; overflow:hidden')
}()
