# HyperMD Test Suites

## Running Test

0. Run `node tools/prepare`
1. Start HTTP server on HyperMD project directory.
2. Open `http://localhost:xxxx/test/`.
   - Optionally, add `?cases=foo/*,bar/baz` ... to choose test cases to run
3. Once finished, the title of window will change.
   - If a test task failed, its `detail` will presents on the page.

## Create a Test

Let's say the test is `abc/foobar`. Create `abc/foobar.ts` in `src` dir and write out:

```typescript
import { Test } from "hypermd_test/tester";

export const test = new Test('FooBar of ABC')

test.add('Feature1', (out) => {
  return true; // feature1 test pass
})

test.add('Feature2', (out) => {
  out.detail = "Seems feature2 not implemented."; // <- `detail` can be a string, Error, JSON-able object, or HTMLElement
  return false; // feature2 failed.
})

test.add('Feature3', (out) => {
  throw new Error("Hell no! Feature3 Failed!") // <- `out.detail` will be replaced by this Error object
})

test.add('Feature4 (Async)', async (out) => { // <- async task function is supported
  const value = await get_answer_to_unverse();
  return value == 42;
})
```
