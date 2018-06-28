import { TaskResult, elt } from 'hypermd_test/tester'

import * as CodeMirror from "codemirror"
import "codemirror/addon/runmode/runmode"

import "hypermd/core"
import "hypermd/mode/hypermd"
import * as Mode from "hypermd/mode/hypermd"

export function createModeTask(input: string, expect?: ExpectData | string[][], modeOptions?: object) {
  var _expect = expect as ExpectData

  if (expect && !('text' in expect[0])) {
    _expect = (expect as string[][]).map(it => ({ text: it[0], styles: it[1] || '' }))
  }

  return function (d: TaskResult) {
    var ans = runMode(input, modeOptions);

    if (!expect) {
      // output ans

      // form1
      // var ans2 = ans.map(x => ({ text: x.text, styles: x.styles.join(" ") }))
      // var ans2_str = (JSON.stringify(ans2, null, 2))

      // form2
      var ans2 = ans.map(x => "  " + JSON.stringify([x.text, x.styles.join(" ")]) + ",\n")
      var ans2_str = ("[\n" + ans2.join("") + "]")

      let el = elt("div", null, "(Test script error) `Expected Value` not given, your test script is incompleted.")
      el.appendChild(elt("h4", null, "== Input Text =="))
      el.appendChild(elt("pre", null, input))
      el.appendChild(elt("h4", null, "== Sample of `Expected Value` =="))
      el.appendChild(elt("pre", null, ans2_str))
      d.detail = el

      return false
    }

    var i = checkResult(ans, _expect)
    if (i === -1) return true

    var e_i = _expect[i] || { styles: [''], text: '(SHALL NOT EXIST)' }
    var a_i = ans[i] || { styles: [''], text: '(NOT EXIST)', state: null }

    var errInfo = [
      "[Expect] [Text] " + e_i.text,
      "[Get   ] [Text] " + a_i.text,
      "----------------------",
      "[Expect] [Style] " + toStyleArray(e_i.styles).join(' '),
      "[Get   ] [Style] " + toStyleArray(a_i.styles).join(' '),
      "----------------------",
      JSON.stringify(a_i.state, null, 2)
    ].join("\n")

    ans[i].styles.push("hmd-test-error")
    var c = renderResult(ans);
    c.appendChild(document.createElement("hr"));
    c.appendChild(document.createTextNode(errInfo));

    d.detail = c

    return false
  }
}

//-----------------------------------------------------

export type ExpectData = { text: string, styles: string[] | string }[];

declare module "codemirror" {
  export function runMode<T>(input: string, modeOptions: object, callback: (HTMLElement | ((text: string, style: string, pos: number, start: number, state: T) => void)), options?: any): void
}

export function toStyleArray(s: string | string[]) {
  var ans: string[]

  if (!s) return [];
  else if (typeof s == 'string') ans = s.trim().split(/\s+/g);
  else ans = s;

  ans.sort();
  if (ans.length === 1 && !ans[0]) ans = [];

  return ans;
}

export function runMode(input: string, modeOptions?: object) {
  var mode = { name: "hypermd", ...modeOptions }
  var ans = [] as {
    text: string,
    styles: string[],
    state: Mode.HyperMDState,
  }[]

  CodeMirror.runMode<Mode.HyperMDState>(input, mode, (text, styles, pos, start, state) => {
    ans.push({
      text,
      styles: toStyleArray(styles),
      state: state ? JSON.parse(JSON.stringify(state)) : null,
    })
  })

  return ans;
}

/** @returns incorrect since which token. -1 means everything is correct */
export function checkResult(data: ReturnType<typeof runMode>, expect: ExpectData): number {
  for (var i = 0; i < expect.length; i++) {
    var a = data[i], b = expect[i];
    if (!a) return i - 1;
    if (a.text !== b.text) return i;

    if (a.styles.join(" ") !== toStyleArray(b.styles).join(" ")) return i;
  }
  if (data.length > expect.length) return expect.length;
  return -1;
}

function renderResult(data: ReturnType<typeof runMode>): HTMLPreElement {
  var container = document.createElement('pre');
  container.className = "cm-s-default";

  data.forEach(it => {
    var span = document.createElement("span")
    span.className = it.styles ? it.styles.map(x => `cm-${x}`).join(' ') : ''
    span.textContent = it.text
    container.appendChild(span)
  })

  return container
}
