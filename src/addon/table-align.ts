// HyperMD, copyright (c) by laobubu
// Distributed under an MIT license: http://laobubu.net/HyperMD/LICENSE
//
// Align Table Columns
//

import CodeMirror, { LineHandle } from 'codemirror'
import { Addon, FlipFlop, debounce, updateCursorDisplay } from '../core'
import { cm_t } from '../core/type'


/********************************************************************************** */
//#region Addon Options

export interface TableAlignOptions extends Addon.AddonOptions {
  enabled: boolean
}

export const defaultOption: TableAlignOptions = {
  enabled: false
}

const OptionName = "hmdTableAlign"
type OptionValueType = Partial<TableAlignOptions> | boolean;

CodeMirror.defineOption(OptionName, defaultOption, function (cm: cm_t, newVal: OptionValueType) {
  const enabled = !!newVal

  if (!enabled || typeof newVal === "boolean") {
    newVal = { enabled: enabled }
  }

  var newCfg = Addon.migrateOption(newVal, defaultOption)

  ///// apply config
  var inst = getAddon(cm)

  inst.ff_enable.setBool(newCfg.enabled)

  ///// write new values into cm
  for (var k in defaultOption) inst[k] = newCfg[k]
})

declare global { namespace HyperMD { interface EditorConfiguration { [OptionName]?: OptionValueType } } }

//#endregion

/********************************************************************************** */
//#region Addon Class

const AddonAlias = "tableAlign"
export class TableAlign implements Addon.Addon, TableAlignOptions {
  enabled: boolean;

  public ff_enable: FlipFlop  // bind/unbind events

  public styleEl = document.createElement("style")

  constructor(public cm: cm_t) {
    this.ff_enable = new FlipFlop(
      /* ON  */() => {
        cm.on("renderLine", this._procLine)
        document.head.appendChild(this.styleEl)
        cm.refresh()
      },
      /* OFF */() => {
        cm.off("renderLine", this._procLine)
        document.head.removeChild(this.styleEl)
      }
    )
  }

  private _lastCSS: string

  /**
   * Remeasure visible columns, update CSS style to make columns aligned
   *
   * (This is a debounced function)
   */
  updateStyle = debounce(() => {
    if (!this.enabled) return

    const cm = this.cm
    const measures = this.measure()
    const css = this.makeCSS(measures)
    if (css === this._lastCSS) return

    this.styleEl.textContent = this._lastCSS = css
    setTimeout(() => updateCursorDisplay(cm), 50)
  }, 100)

  /** CodeMirror renderLine event handler */
  private _procLine = (cm: cm_t, line: LineHandle, el: HTMLPreElement) => {
    if (!el.querySelector('.cm-hmd-table-sep')) return
    const lineSpan = el.firstElementChild
    const lineSpanChildren = Array.prototype.slice.call(lineSpan.childNodes, 0) as Node[]

    var columnIdx = 0
    var columnSpan = this.makeColumn(columnIdx)
    var measureHelper = this.makeMeasureHelper(columnIdx)
    for (const el of lineSpanChildren) {
      if (el.nodeType === Node.ELEMENT_NODE && /cm-hmd-table-sep/.test((el as HTMLElement).className)) {
        // found a "|", and a column is finished
        columnIdx++
        columnSpan.appendChild(measureHelper)
        lineSpan.appendChild(columnSpan)
        lineSpan.appendChild(el)

        columnSpan = this.makeColumn(columnIdx)
        measureHelper = this.makeMeasureHelper(columnIdx)
      } else {
        columnSpan.appendChild(el)
      }
    }
    columnSpan.appendChild(measureHelper)
    lineSpan.appendChild(columnSpan)

    this.updateStyle()
  }

  /** create a invisible helper to measure column content width */
  makeMeasureHelper(index: number): HTMLSpanElement {
    var span = document.createElement("span")
    span.className = "hmd-table-column-mhelper"
    return span
  }

  /** create a <span> container as column, note that its last child must be a measureHelper */
  makeColumn(index: number): HTMLSpanElement {
    var span = document.createElement("span")
    span.className = "hmd-table-column hmd-table-column-" + index
    span.setAttribute("data-column", "" + index)
    span.setAttribute("style", "position:relative;white-space:pre")
    return span
  }

  /** Measure all visible tables and columns */
  measure() {
    const cm = this.cm
    const lineDiv = cm.display.lineDiv as HTMLDivElement // contains every <pre> line
    const measureHelpers = lineDiv.querySelectorAll(".hmd-table-column-mhelper")

    /** every table's every column's width in px */
    var ans: { [tableID: string]: number[] } = {}

    for (let i = 0; i < measureHelpers.length; i++) {
      const measureHelper = measureHelpers[i] as HTMLSpanElement
      const column = measureHelper.parentElement as HTMLSpanElement
      const line = column.parentElement.parentElement as HTMLPreElement

      const tableID = line.className.match(/HyperMD-table_(\S+)/)[1]
      const columnIdx = ~~column.getAttribute("data-column")
      const width = measureHelper.offsetLeft

      if (!(tableID in ans)) ans[tableID] = []
      var columnWidths = ans[tableID]
      while (columnWidths.length <= columnIdx) columnWidths.push(0)
      if (columnWidths[columnIdx] < width) columnWidths[columnIdx] = width
    }

    return ans
  }

  /** Generate CSS */
  makeCSS(measures: { [tableID: string]: number[] }): string {
    var rules: string[] = []
    for (const tableID in measures) {
      const columnWidths = measures[tableID]
      const rulePrefix = `pre.HyperMD-table-row.HyperMD-table_${tableID} .hmd-table-column-`
      for (let columnIdx = 0; columnIdx < columnWidths.length; columnIdx++) {
        const width = columnWidths[columnIdx]
        rules.push(`${rulePrefix}${columnIdx} { min-width: ${width}px }`)
      }
    }
    return rules.join("\n")
  }
}

//#endregion

/** ADDON GETTER (Singleton Pattern): a editor can have only one MyAddon instance */
export const getAddon = Addon.Getter(AddonAlias, TableAlign, defaultOption)
declare global { namespace HyperMD { interface HelperCollection { [AddonAlias]?: TableAlign } } }
