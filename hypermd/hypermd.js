/** Provides HyperMD utils */

window.HyperMD = (function () {
    function reHighlight(cm) {
        cm.eachLine(function (line) {
            if (/^```\s*\S/.test(line.text)) {
                // found a beginning of code block
                // make a "change" event on this line, and re-highlighting
                var lineNo = line.lineNo()
                var lineLen = line.text.length
                cm.replaceRange(
                    line.text.charAt(lineLen - 1),
                    { line: lineNo, ch: lineLen - 1 },
                    { line: lineNo, ch: lineLen }
                )
            }
        })
    }

    function HyperMD() {

    }

    HyperMD.reHighlight = reHighlight

    return HyperMD
})()
