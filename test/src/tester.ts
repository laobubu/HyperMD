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
  detail: any,
}

export interface TestResult {
  count: number
  success: number
  fail: number

  details: TaskResult[]
}

const NAME_SEPARATOR = " / ";

export class Test {
  public tasks: Task[] = [];

  constructor(public name: string) {

  }

  add(name: string, fn: TaskFn);
  add(task: Task);
  add(test: Test);

  add(arg1: string | Task | Test, fn?: TaskFn) {
    if (typeof arg1 !== 'string') {
      if ('tasks' in arg1) {
        // is "Test". Convert it to "Task"
        this.tasks.push({
          name: this.name + NAME_SEPARATOR + arg1.name,
          async fn(d) {
            let ans = await arg1.run()
            d.detail = ans
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
  }

  async run(procCb?: TestProgressFn) {
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

    var promises = ans.details.map(
      (d) => new Promise(finish => {
        try {
          const _ta = d.task.fn(d);

          if (typeof _ta === 'boolean') {
            d.success = _ta;
            finish();
          } else { //_ta is a Promise
            _ta.then((success) => {
              d.success = success;
              finish();
            }).catch((err) => {
              d.success = false;
              d.detail = err;
              finish();
            })
          }
        } catch (err) {
          d.success = false;
          d.detail = err;
          finish()
        }
      }).then(() => {
        d.success ? ans.success++ : ans.fail++;
        if (procCb) procCb(this, d, ans);
      })
    )

    await Promise.all(promises)

    return ans
  }
}
