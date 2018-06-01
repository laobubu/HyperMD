function init_math_preview(cm) {
  var mathRenderer = null
  var win = null

  function updatePreview(expr) {
    if (!mathRenderer) { // initialize renderer and preview window
      win = initFloatWin("math-preview")
      mathRenderer = cm.hmd.FoldMath.createRenderer(
        document.getElementById("math-preview-content"),
        "display"
      )
      mathRenderer.onChanged = function () {
        // finished rendering. show the window
        if (!win.visible) {
          var cursorPos = cm.charCoords(cm.getCursor(), "window")
          win.moveTo(cursorPos.left, cursorPos.bottom)
        }
        win.show()
      }
    }

    console.log("[MathPreview] " + expr)

    if (!mathRenderer.isReady()) return
    mathRenderer.startRender(expr)
  }

  function hidePreview() {
    console.log("[MathPreview] (exit)")

    if (win) win.hide()
  }

  cm.setOption("hmdFoldMath", {
    onPreview: updatePreview,
    onPreviewEnd: hidePreview,
  })
}
