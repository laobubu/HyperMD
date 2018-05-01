// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/hypermd/LICENSE
//
// align table columns by adjusting table separators ("|") styles
// insert a <style> for every table and dynamically update it
//

(function (mod) {
  var CODEMIRROR_ROOT = window.CODEMIRROR_ROOT || "codemirror/";
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(
      require(CODEMIRROR_ROOT + "lib/codemirror"),
      require("./../hypermd")
    );
  else if (typeof define == "function" && define.amd) // AMD
    define([
      CODEMIRROR_ROOT + "lib/codemirror",
      "./../hypermd",
    ], mod);
  else // Plain browser env
    mod(CodeMirror, HyperMD);
})(function (CodeMirror, HyperMD) {
  "use strict";

  var DEBUG = false

  function isTableRow(cm, line) {
    return (line < cm.lineCount()) && cm.getStateAfter(line).overlay.table
  }

  /**
   * Create a table instance since `line`
   *
   * @param {Aligner} aligner
   * @param {number} line
   */
  function Table(aligner, line) {
    var styleEl = document.createElement("style")

    this.cm = aligner.cm
    this.aligner = aligner
    this.line = line
    this.mark = this.cm.setBookmark({ line: line, ch: 0 }, { widget: styleEl })
    this.styleEl = styleEl
  }

  /**
   * re-measure every column's width, then update the spans' style
   *
   * @returns {number} rows scanned
   */
  Table.prototype.measureAndAlign = function () {
    var cm = this.cm

    // we only care about visible lines
    // FIXME: assuming no row line is folded!
    var tmp = cm.getViewport()
    var vrow_from = tmp.from, vrow_to = tmp.to
    var lvs = cm.display.view

    var table_from = this.line, table_to = table_from
    while (isTableRow(cm, table_to + 1)) table_to++

    if (vrow_from > table_from) table_from = vrow_from
    if (vrow_to < table_to) table_to = vrow_to

    // now start checking every row
    // compute every column's width and fetch every separator <span> (both element and column width)

    /** @type {[HTMLSpanElement, number][][]} */
    var seps = []

    var col_widths = []

    for (var y = table_from; y <= table_to; y++) {
      var lv = lvs[y - vrow_from]
      var span_and_colwidth_s = []

      //FIXME: sometime lv is null
      var seps_raw = lv ? lv.text.querySelectorAll('span.cm-hmd-table-sep') : []
      var lastLeft = 0

      for (var colidx = 0; colidx < seps_raw.length; colidx++) {
        var left = seps_raw[colidx].offsetLeft
        var width = left - lastLeft
        if (width < 0) {
          // word-wrap.... this line is too long
          // FIXME: still buggy
          width = lv.text.offsetWidth + width
        }

        if (col_widths.length <= colidx) col_widths.push(width)
        else if (col_widths[colidx] < width) col_widths[colidx] = width

        if (DEBUG) {
          console.log(
            "TABLE SCAN ROW" + y, "COL" + colidx,
            "width: " + width, ", best:" + col_widths[colidx]
          )
        }

        span_and_colwidth_s.push([seps_raw[colidx], width])

        lastLeft = left + seps_raw[colidx].offsetWidth
      }

      seps.push(span_and_colwidth_s)
    }

    // now can modify the style

    var styles = []
    var olState = cm.getStateAfter(table_from).overlay // state from `hypermd` mode
    var sfirstRow = olState.tableRow
    var sprefix = "pre.HyperMD-table_" + olState.table

    var cursorPos = cm.getCursor('head')

    // compute styles

    for (var row = 0; row < seps.length; row++) {
      var seps_row = seps[row]
      var lv = lvs[row + table_from - vrow_from]
      var line_updated = true

      for (var col = 0; col < seps_row.length; col++) {
        var span = seps_row[col][0]
        var w = seps_row[col][1]
        var wdiff = col_widths[col] - w

        if (wdiff > 0) {
          styles.push(
            sprefix + ".HyperMD-table-row-" + (sfirstRow + row) +
            " span.cm-hmd-table-sep-" + col +
            " { padding-left: " + wdiff + "px }"
          )
          line_updated = true
        }

        if (DEBUG) {
          console.log(
            "TABLE Adjust (" + row + "," + col + ")",
            "width " + w, " fitting " + col_widths[col],
            span
          )
        }
      }

      if (line_updated) {
        if (lv && lv.measure) lv.measure.cache = {}
        if (cursorPos.line === row + table_from) {
          // console.log("LINE UPDATES", lv && lv.lineNumber.textContent, Object.keys(lv.measure.cache))
          //NOTE: extracted from codemirror.js : function updateSelection(cm)
          setTimeout(function() {
            cm.display.input.showSelection(cm.display.input.prepareSelection())
          }, 0)
        }
      }
    }

    this.styleEl.innerHTML = styles.join("\n")
    return seps.length
  }



  ///////////////////////////////////////////////////////////
  /// Main Controller

  function Aligner(cm) {
    this.cm = cm
    this.tables = /** @type {Table[]} */([])
    this.enabled = false

    this._doAlign = HyperMD.debounce(this.doAlign.bind(this), 120)
  }

  /**
   * get or create a table that contains one line
   * @param {number} line
   * @returns {Table|null}
   */
  Aligner.prototype.getTableAt = function (line) {
    if (!isTableRow(this.cm, line)) return null // current line is not in a table
    while (line >= 0 && isTableRow(this.cm, line)) line--
    line++
    // now `line` is the title row's lineNo

    // get the markers
    var marks = this.cm.findMarksAt({ line: line, ch: 0 })
    var ans = null

    if (marks.length > 0) {
      for (var i = 0; !ans && i < this.tables.length; i++) {
        var table = this.tables[i]
        for (var j = 0; j < marks.length; j++) {
          var mark = marks[j]
          if (mark === table.mark) {
            ans = table
            break
          }
        }
      }
    }

    if (!ans) {
      // create a new table
      ans = new Table(this, line) // found title row, creating a table
      this.tables.push(ans)
    }

    return ans
  }

  Aligner.prototype.enable = function () {
    if (this.enabled) return
    this.enabled = true

    this.cm.on('viewportChange', this._doAlign)
    this.cm.on('renderLine', this._doAlign)
    this.cm.on('cursorActivity', this._doAlign)
  }

  Aligner.prototype.disable = function () {
    if (!this.enabled) return
    this.enabled = false

    this.cm.off('viewportChange', this._doAlign)
    this.cm.off('renderLine', this._doAlign)
    this.cm.off('cursorActivity', this._doAlign)
  }

  Aligner.prototype.doAlign = function () {
    var cm = this.cm

    // we only care about visible lines
    // FIXME: assuming no row line is folded!
    var tmp = cm.getViewport()
    var vl_from = tmp.from, vl_to = tmp.to

    for (var line = vl_from; line < vl_to; line++) {
      var table = this.getTableAt(line)
      if (!table) continue
      if (DEBUG) console.log("table-align found table at " + line, table)
      line += table.measureAndAlign() // re-align and skip processed lines
    }
  }

  /** @returns {Aligner} */
  function getAligner(cm) {
    if (!cm.hmd) cm.hmd = {}
    if (!cm.hmd.tableAligner) cm.hmd.tableAligner = new Aligner(cm)
    return cm.hmd.tableAligner
  }

  /**
   * define a boolean option, toggling the table aligner
   */
  CodeMirror.defineOption("hmdTableAlign", false, function (cm, newVal, oldVal) {
    // complete newCfg with default values
    var aligner = getAligner(cm)
    if (oldVal == 'CodeMirror.Init') oldVal = false

    if (!oldVal ^ !newVal) {
      newVal ? aligner.enable() : aligner.disable()
    }
  })
})