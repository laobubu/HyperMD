'use strict'

const path = require('path')
const fs = require('fs')
const glob = require('glob')
const utils = require('./utils')

process.chdir(path.resolve(__dirname, '../theme'))

let argv = process.argv.slice(2)

let noOpen = utils.find_and_remove(argv, '-n')

let action = argv.shift()
let themeNames = argv.slice()

if (action !== 'build' && action !== 'watch') {
  console.log(`HyperMD theme build tool...

  dev-theme [-n] ACTION THEME [THEME THEME ...]

  where ACTION can be : build
                        watch
        THEME can be : theme name (with or without .scss suffix)
                       glob pattern (eg. *.scss)

  -n     When action is "watch", don't start the http server.
  `)
  process.exit(1)
}

/** expand glob */
for (let i = 0; i < themeNames.length; i++) {
  let name = themeNames[i]
  if (!/[*?]/.test(name)) continue

  if (!/\.s[ac]ss$/i.test(name)) name += '.s[ac]ss'
  let foundItems = glob.sync(name)

  themeNames.splice(i, 1, ...foundItems)
  i = i - 1 + foundItems.length
}

if (!themeNames.length) {
  console.log("No theme to be processed. Exit.")
  process.exit(0)
}

/** start compile */

let httpServerProc = (action === 'watch' && !noOpen) && utils.node_bin_run('hmd-hs', [
  '-d', '..',
  '-o', 'test/playground/#theme=' + themeNames[0].replace(/\.\w+$/, ''),
])

Promise.all(themeNames.map(name => startWork(name)))
  .catch(err => {
    console.error("Error!")
    console.error(err)
    if (httpServerProc) httpServerProc.kill()
    process.exit(1)
  })
  .then(() => {
    process.exit(0)
  })

function startWork(themeName) {
  let scssFile = ''
  let cssFile = ''

  if (fs.existsSync(themeName)) scssFile = themeName
  else if (fs.existsSync(themeName + '.scss')) scssFile = themeName + '.scss'
  else if (fs.existsSync(themeName + '.sass')) scssFile = themeName + '.sass'
  else {
    console.error('Cannot find theme file for ' + themeName)
    process.exit(1)
  }

  themeName = scssFile.slice(0, -5)
  cssFile = themeName + '.css'

  let sassArgs = [
    scssFile,
    cssFile,
  ]

  if (action === 'watch') sassArgs.unshift('--watch')

  return utils.wait_for_process(utils.node_bin_run('sass', sassArgs)).then(() => {
    console.log("[.] SUCCESS : " + themeName)
  }).catch(err => {
    console.error("[X] FAILED : " + themeName)
    return Promise.reject(err)
  })
}
