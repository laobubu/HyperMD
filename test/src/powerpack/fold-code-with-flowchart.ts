import { Test } from "hypermd_test/tester";
import { cm, init, destory, querySelector } from "hypermd_test/addon/_base";
import { sleep, assert } from "hypermd_test/utils";

import "hypermd/powerpack/fold-code-with-flowchart"

export const test = new Test('Powerpack: fold-code-with-flowchart')

test.add('init', () => {
  init()
  cm.setValue(`Hello
\`\`\`flow
st=>start: Start:>http://www.google.com[blank]
e=>end:>http://www.google.com
op1=>operation: My Operation
sub1=>subroutine: My Subroutine
cond=>condition: Yes
or No?:>http://www.google.com
io=>inputoutput: catch something...
para=>parallel: parallel tasks

st->op1->cond
cond(yes)->io->e
cond(no)->para
para(path1, bottom)->sub1(right)->op1
para(path2, top)->op1
\`\`\`
`)
  return true
})

test.add('render', async () => {
  await sleep(500)
  querySelector('.hmd-fold-code-flowchart')
  return true
})

test.add('destory', () => {
  // destory()
  return true
})
