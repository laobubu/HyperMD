/**
  @internal DO NOT IMPORT THIS MODULE!
            If you want to use this module, import it from `core`:

                import { cm_internal } from "../core"

  The following few functions are from CodeMirror's source code.

  MIT License

  Copyright (C) 2017 by Marijn Haverbeke <marijnh@gmail.com> and others

  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in
  all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
  THE SOFTWARE.

  */

(function (mod){ //[HyperMD] UMD patched!
  /*commonjs*/  ("object"==typeof exports&&"undefined"!=typeof module) ? mod(null, exports, ) :
  /*amd*/       ("function"==typeof define&&define.amd) ? define(["require","exports"], mod) :
  /*plain env*/ mod(null, (this.HyperMD = this.HyperMD || {}), );
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /**
     * Find the view element corresponding to a given line. Return null when the line isn't visible.
     *
     * @see codemirror\src\measurement\position_measurement.js 5.37.0
     * @param n lineNo
     */
    function findViewIndex(cm, n) {
        if (n >= cm.display.viewTo)
            return null;
        n -= cm.display.viewFrom;
        if (n < 0)
            return null;
        var view = cm.display.view;
        for (var i = 0; i < view.length; i++) {
            n -= view[i].size;
            if (n < 0)
                return i;
        }
    }
    exports.findViewIndex = findViewIndex;
    /**
     * Find a line view that corresponds to the given line number.
     *
     * @see codemirror\src\measurement\position_measurement.js 5.37.0
     */
    function findViewForLine(cm, lineN) {
        if (lineN >= cm.display.viewFrom && lineN < cm.display.viewTo)
            return cm.display.view[findViewIndex(cm, lineN)];
        var ext = cm.display.externalMeasured;
        if (ext && lineN >= ext.lineN && lineN < ext.lineN + ext.size)
            return ext;
    }
    exports.findViewForLine = findViewForLine;
    /**
     * Find a line map (mapping character offsets to text nodes) and a
     * measurement cache for the given line number. (A line view might
     * contain multiple lines when collapsed ranges are present.)
     *
     * @see codemirror\src\measurement\position_measurement.js 5.37.0
     */
    function mapFromLineView(lineView, line, lineN) {
        if (lineView.line == line)
            return { map: lineView.measure.map, cache: lineView.measure.cache, before: false };
        for (var i = 0; i < lineView.rest.length; i++)
            if (lineView.rest[i] == line)
                return { map: lineView.measure.maps[i], cache: lineView.measure.caches[i], before: false };
        for (var i = 0; i < lineView.rest.length; i++)
            if (lineView.rest[i].lineNo() > lineN)
                return { map: lineView.measure.maps[i], cache: lineView.measure.caches[i], before: true };
    }
    exports.mapFromLineView = mapFromLineView;
});
