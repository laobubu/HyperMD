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
    this.lastStyle = ""
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
    var sep_widths = [] // separators' width, useful when calc position . note that sep_widths.length <= col_widths.width

    for (var y = table_from; y <= table_to; y++) {
      var lv = lvs[y - vrow_from]
      var span_and_colwidth_s = []

      var seps_raw = lv && lv.text && lv.text.querySelectorAll('span.cm-hmd-table-sep') || []
      var lastLeft = 0

      //FIXME: assuming every separator has the same width and no padding....
      var sep_width = 4
      if (seps_raw.length > 0) {
        var tmp = window.getComputedStyle(seps_raw[0])
        sep_width = parseFloat(tmp['width'] || '4')
      }

      for (var colidx = 0; colidx < seps_raw.length; colidx++) {
        /** @type {HTMLSpanElement} */ var span = seps_raw[colidx]
        var left = span.offsetLeft
        // var sep_width = ... // FIXME: use correct way to compute
        var right = left + span.offsetWidth
        var width = left - lastLeft
        if (width < 0) {
          // word-wrap.... this line is too long
          // FIXME: still buggy
          width = lv.text.offsetWidth + width
        }

        if (col_widths.length <= colidx) {
          col_widths.push(width)
          sep_widths.push(sep_width)
        } else {
          if (col_widths[colidx] <= width) {
            col_widths[colidx] = width
            if (sep_widths[colidx] < sep_width) {
              sep_widths[colidx] = sep_width
            }
          }
        }

        if (DEBUG) {
          console.log(
            "TABLE SCAN ROW" + y, "COL" + colidx,
            "width: " + width, ", best:" + col_widths[colidx]
          )
        }

        span_and_colwidth_s.push([seps_raw[colidx], width])

        lastLeft = right
      }

      // last pipe char was omitted
      if (lv && !/\|\s*$/.test(lv.line.text)) {
        // colidx = seps_raw.length
        width = lv.text.firstElementChild.offsetWidth + sep_width - lastLeft
        if (col_widths.length <= colidx) {
          col_widths.push(width)
          sep_widths.push(0)
        } else {
          if (col_widths[colidx] <= width) col_widths[colidx] = width
        }
      }

      seps.push(span_and_colwidth_s)
    }

    var lastColumnHasNoTailingPipeChar = (sep_widths[sep_widths.length - 1] === 0)
    if (lastColumnHasNoTailingPipeChar) {
      sep_widths.splice(-1)
    }

    // now can modify the style

    var styles = []
    var olState = cm.getStateAfter(table_from).overlay // state from `hypermd` mode
    var sfirstRow = olState.tableRow
    var sprefix = "pre.HyperMD-table_" + olState.table

    // compute styles

    for (var row = 0; row < seps.length; row++) {
      var seps_row = seps[row]
      var lv = lvs[row + table_from - vrow_from]

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
        }

        if (DEBUG) {
          console.log(
            "TABLE Adjust (" + row + "," + col + ")",
            "width " + w, " fitting " + col_widths[col],
            span
          )
        }
      }
    }

    // generate background image

    var aligner = this.aligner
    var lineColorEnc = encodeURIComponent(aligner.lineColor)

    var rects = []
    var width_sum = 0
    for (var i = 0; i < sep_widths.length; i++) {
      width_sum += col_widths[i] + sep_widths[i]
      var left = width_sum - sep_widths[i] / 2
      rects.push('<line x1="' + left + '" y1="0" x2="' + left + '" y2="100" stroke="' + lineColorEnc + '" />')
    }

    if (lastColumnHasNoTailingPipeChar) width_sum += col_widths[col_widths.length - 1]

    var bgimg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + width_sum + ' 100">' + rects.join('') + '</svg>'
    styles.push(sprefix + " { background: url('data:image/svg+xml," + bgimg + "') repeat-y 0 center; background-size: " + width_sum + "px auto; }")


    if (aligner.rowsepColor) {
      // special background image for  |:------------:|:--------:| line
      var x1 = (col_widths[0] + sep_widths[0] / 2)
      var x2 = left // using last iterating's result
      if (lastColumnHasNoTailingPipeChar) {
        // last pipe char was omitted
        x2 += col_widths[col_widths.length - 1]
      }

      if (x2 - x1 < 10) {
        // too near
        x1 = 0
        x2 = width_sum
      } else if (x1 > sep_widths[0] * 2) {
        // maybe leading optional "|" is missing ?
        x1 = 0
      }

      var bgimg_rowsep = bgimg.slice(0, -6) +
        '<line x1="' + x1 + '" x2="' + x2 + '" y1="50" y2="50" stroke="' + encodeURIComponent(aligner.rowsepColor) + '"/></svg>'
      styles.push(sprefix + ".HyperMD-table-row-1 { background-image: url('data:image/svg+xml," + bgimg_rowsep + "'); }")
    }

    // apply style

    var new_css = styles.join("\n")
    if (this.lastStyle !== new_css) {
      this.lastStyle = new_css
      this.styleEl.innerHTML = new_css
    }
    return seps.length
  }


  /**
   * remove this table
   */
  Table.prototype.clear = function () {
    this.mark.clear()
    this.lastStyle = ""
    this.styleEl = null
  }

  ///////////////////////////////////////////////////////////
  /// Main Controller

  /** @constant */ var AlignerDefaults = {
    lineColor: '#999',
    rowsepColor: '#999',  // can be null
  }

  function Aligner(cm) {
    this.cm = cm
    this.tables = /** @type {Table[]} */([])
    this.enabled = false

    this.lineColor = AlignerDefaults.lineColor
    this.rowsepColor = AlignerDefaults.rowsepColor

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
    this.cm.on('update', this._doAlign)
    this.cm.on('cursorActivity', this._doAlign)

    this.doAlign()
  }

  Aligner.prototype.disable = function () {
    if (!this.enabled) return
    this.enabled = false

    this.cm.off('viewportChange', this._doAlign)
    this.cm.off('update', this._doAlign)
    this.cm.off('cursorActivity', this._doAlign)

    this.removeAll()
  }

  Aligner.prototype.doAlign = function () {
    var cm = this.cm

    // we only care about visible lines
    // FIXME: assuming no row line is folded!
    var tmp = cm.getViewport()
    var vl_from = tmp.from, vl_to = tmp.to
    var found_table = 0

    for (var line = vl_from; line < vl_to; line++) {
      var table = this.getTableAt(line)
      if (!table) continue
      found_table++
      if (DEBUG) console.log("table-align found table at " + line, table)
      line += table.measureAndAlign() // re-align and skip processed lines
    }

    if (found_table !== 0) {
      HyperMD.updateCursorDisplay(cm)
    }
  }

  Aligner.prototype.removeAll = function () {
    this._doAlign.stop()
    for (var i = 0; i < this.tables.length; i++) {
      this.tables[i].clear()
    }
    this.tables = []
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

    if (newVal) {
      var newCfg = {}
      for (var k in AlignerDefaults) {
        aligner[k] = newVal.hasOwnProperty(k) ? newVal[k] : AlignerDefaults[k]
      }
    }

    if (!oldVal ^ !newVal) {
      newVal ? aligner.enable() : aligner.disable()
    }
  })
})