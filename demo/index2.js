/* global editor, CODEMIRROR_ROOT */

// the following code is just for test.
// useless for you.

function click_bind(id, func, event) {
    var btn = document.getElementById(id)
    btn.addEventListener(event || "click", func, false)
}

click_bind("raw_mode", function () {
    editor.setOption('theme', 'default')

    // stop auto folding
    editor.setOption('hmdAutoFold', 0)
    editor.setOption('hmdFoldMath', false)

    // unfold all folded parts
    setTimeout(function () {
        var marks = editor.getAllMarks()
        for (var i = 0; i < marks.length; i++) {
            var mark = marks[i]
            if (/^hmd-/.test(mark.className)) mark.clear()
        }
    }, 200) // FIXME: the timeout is not determined

    // stop hiding tokens
    editor.setOption('hmdHideToken', '')
})

click_bind("hypermd_mode", function () {
    editor.setOption('theme', 'hypermd-light')
    editor.setOption('hmdAutoFold', 200)
    editor.setOption('hmdFoldMath', { interval: 200, preview: true })
    editor.setOption('hmdHideToken', '(profile-1)')
})

var $load_mode = document.getElementById('load_mode')

!function LoadModeList() {
    var name_alias = {
        clike: "c,cpp,csharp,scala,java,kotlin,nesc,objectivec,squirrel,ceylon",
        octave: "matlab",
        htmlembedded: "jsp",
        htmlembedded: "asp.net",
        gas: "AT&T ASM"
    }, name_alias_rev = {}, modes = ''

    for (var name in name_alias) {
        name_alias[name].split(/,\s*/g).forEach(function (alias) {
            name_alias_rev[alias] = name
            modes += alias + ','
        })
    }

    modes +=
        'apl,asciiarmor,asn.1,asterisk,brainfuck,clike,clojure,cmake,cobol,coffeescript,commonlisp,crystal,css,cypher,d,dart,diff,django,dockerfile,dtd,dylan,ebnf,ecl,eiffel,elm,erlang,factor,fcl,forth,fortran,gas,gherkin,go,groovy,haml,handlebars,haskell,haskell-literate,haxe,htmlembedded,htmlmixed,http,idl,javascript,jinja2,jsx,julia,livescript,lua,mathematica,mbox,mirc,mllike,modelica,mscgen,mumps,nginx,nsis,ntriples,octave,oz,pascal,pegjs,perl,php,pig,powershell,properties,protobuf,pug,puppet,python,q,r,rpm,rst,ruby,rust,sas,sass,scheme,shell,sieve,slim,smalltalk,smarty,solr,soy,sparql,spreadsheet,sql,stex,stylus,swift,tcl,textile,tiddlywiki,tiki,toml,tornado,troff,ttcn,ttcn-cfg,turtle,twig,vb,vbscript,velocity,verilog,vhdl,vue,webidl,xml,xquery,yacas,yaml,yaml-frontmatter,z80'

    modes.split(',')
        .sort()
        .forEach(function (name) {
            var opt = document.createElement('option')
            var value = name_alias_rev[name] || name
            if (name != value) name += " (alias " + value + ")"
            opt.textContent = name
            opt.value = value
            $load_mode.appendChild(opt)
        })
}()

click_bind("load_mode", function () {
    var mode = $load_mode.value, fail
    $load_mode.setAttribute('disabled', 'true')
    function unfreeze(color) {
        fail = 0
        $load_mode.children[$load_mode.selectedIndex].style.color = color
        $load_mode.removeAttribute('disabled')
        $load_mode.style.outline = '2px solid ' + color
        setTimeout(function () {
            $load_mode.style.outline = ''
        }, 200)
    }
    fail = setTimeout(unfreeze.bind(null, '#f33'), 1000)
    require(
        [CODEMIRROR_ROOT + 'mode/' + mode + '/' + mode],
        function () {
            clearTimeout(fail)
            unfreeze('#3f3')
        }
    )
}, 'change')

!function hideSplash() {
    if (!window.editor) return setTimeout(hideSplash, 100)
    document.getElementById('header').setAttribute('style', 'height:1px; overflow:hidden')
}()
