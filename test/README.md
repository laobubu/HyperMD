# HyperMD Test Suites

## Running Test

1. Start HTTP server on HyperMD project directory.
2. Open `http://localhost:xxxx/test/`.
3. Once finished, the title of window will change.

## Create a Test

Let's say the test is `abc/foobar`. Create `abc/foobar.ts` in `src` dir and write out:

```typescript
import { Test } from "hypermd_test/tester";

export const test = new Test('FooBar of ABC')

test.add('Feature1', (d) => {
  return true; // feature1 test pass
})

test.add('Feature2', (d) => {
  d.detail = "Seems feature2 not implemented.";
  return false; // feature2 failed.
})

test.add('Feature3', (d) => {
  throw new Error("Hell no! Feature3 Failed!") // <- d.detail will be replaced by this Error object
})
```

## Add to HyperMD test suite

Edit `tests.js`, add `"abc/foobar"` into `caseNames` the array.
