export type TaskFn = (tr: TaskResult) => Promise<boolean> | boolean;
export type TestProgressFn = (test: Test, task_s: TaskResult, test_s: TestResult) => void;

export interface Task {
  name: string;
  fn: TaskFn;
}

/** Task, with result */
export interface TaskResult {
  name: string; // always same as task.name
  task: Task,
  success: boolean,
  detail: string | Error | HTMLElement,
}

export interface TestResult {
  count: number
  success: number
  fail: number

  details: TaskResult[]
}

const NAME_SEPARATOR = " / ";

export function elt(tag: string, attr?: Record<string, string>, text?: string) {
  var ans = document.createElement(tag)
  if (attr) for (var k in attr) ans.setAttribute(k, attr[k])
  if (text) ans.textContent = text
  return ans
}

export function renderResult(tr: TaskResult): HTMLElement {
  if (!tr || tr.success) return null
  const ans = elt("div", { "class": "task-result task-result-fail" })

  ans.appendChild(elt("h3", null, tr.name))

  const detail = tr.detail
  if (detail) {
    if (typeof detail === 'string') {
      ans.appendChild(elt("pre", null, detail))
    } else if ('tagName' in detail) {
      ans.appendChild(detail)
    } else if ('message' in detail) {
      let el = elt("div", { "class": "task-result-error" })
      el.appendChild(elt("pre", { "class": "task-result-error-message" }, detail.toString()))
      el.appendChild(elt("pre", { "class": "task-result-error-stack" }, detail.stack || "(no stack)"))
      ans.appendChild(el)
    } else {
      ans.appendChild(elt("pre", null, JSON.stringify(detail, null, 2)))
    }
  }

  return ans
}

export class Test {
  public tasks: Task[] = [];

  constructor(public name: string) {

  }

  add(name: string, fn: TaskFn): Test;
  add(task: Task): Test;
  add(test: Test): Test;

  add(arg1: string | Task | Test, fn?: TaskFn): Test {
    if (typeof arg1 !== 'string') {
      if ('tasks' in arg1) {
        // is "Test". Convert it to "Task"
        let name = this.name + NAME_SEPARATOR + arg1.name
        this.tasks.push({
          name: name,
          async fn(d) {
            let ans = await arg1.run()
            let el = elt("div", { "class": "subtest-result" })
            el.appendChild(elt("h3", null, name))
            el.appendChild(elt("p", null, `Success: ${ans.success} / ${ans.count}. Failed: ${ans.fail}`))
            ans.details.forEach(it => {
              var el2 = renderResult(it)
              if (el2) el.appendChild(el2)
            })
            d.detail = el
            return ans.fail == 0
          }
        })
      } else {
        // is "Task"
        let newTask = { ...arg1 }
        newTask.name = this.name + NAME_SEPARATOR + newTask.name;
        this.tasks.push(newTask);
      }
    } else {
      // is string (task name)
      this.tasks.push({ name: this.name + NAME_SEPARATOR + arg1, fn })
    }

    return this
  }

  prepare() {
    const tasks = this.tasks
    var ans: TestResult = {
      count: tasks.length,
      success: 0,
      fail: 0,
      details: tasks.map(task => ({
        name: task.name,
        task,
        success: false,
        detail: null,
      }))
    }

    return ans
  }

  finish(ans: TestResult) {

  }

  /**
   * run tasks in sequence
   */
  async run(procCb?: TestProgressFn) {
    var ans = this.prepare()
    var ds = ans.details

    for (let i = 0; i < ds.length; i++) {
      const d = ds[i]
      await runTaskAndFill(d).then(() => {
        d.success ? ans.success++ : ans.fail++;
        if (procCb) procCb(this, d, ans);
      })
    }

    this.finish(ans)
    return ans
  }

  /**
   * run tasks in parallel
   */
  async runParallel(procCb?: TestProgressFn) {
    var ans = this.prepare()

    var promises = ans.details.map(
      (d) => runTaskAndFill(d).then(() => {
        d.success ? ans.success++ : ans.fail++;
        if (procCb) procCb(this, d, ans);
      })
    )

    await Promise.all(promises)

    this.finish(ans)
    return ans
  }
}

/**
 * given a TaskResult whose task is set, but not ran.
 * run the task and fill the TaskResult fields
 *
 * @param d
 */
export async function runTaskAndFill(d: TaskResult) {
  try {
    const _ta = d.task.fn(d);

    if (typeof _ta === 'boolean') {
      d.success = _ta;
    } else { //_ta is a Promise
      d.success = await _ta
    }

  } catch (err) {
    d.success = false;
    d.detail = err;
  }

  return d;
}
