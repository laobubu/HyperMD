(function (factory) {
  if (typeof exports === 'object' && typeof module !== 'undefined') { module.exports = factory(require('./float-win.css')) }
  else if (typeof define === 'function' && define.amd) define(['./float-win.css'], factory)
})(function () {
  'use strict'

  class FloatWin {
    constructor(win) {
      var self = this;

      if (typeof win === 'string') win = document.querySelector(win);
      this.el = win;

      /** @type {HTMLDivElement} */
      var titlebar = win.querySelector('[win-title]');
      titlebar.addEventListener("selectstart", function () { return false; }, false);
      this.titlebar = titlebar

      /** @type {HTMLButtonElement} */
      var closeBtn = win.querySelector('[win-close]');
      if (closeBtn) {
        closeBtn.addEventListener("click", function () { self.hide(); }, false);
        win.addEventListener("keyup", function (ev) {
          if (ev.keyCode === 27)
            self.hide(); // ESC
        }, false);
      }
      this.closeBtn = closeBtn

      var boxX, boxY, mouseX, mouseY, offsetX, offsetY;
      titlebar.addEventListener("mousedown", function (e) {
        if (e.target === closeBtn)
          return;
        boxX = win.offsetLeft;
        boxY = win.offsetTop;
        mouseX = parseInt(getMouseXY(e).x);
        mouseY = parseInt(getMouseXY(e).y);
        offsetX = mouseX - boxX;
        offsetY = mouseY - boxY;
        document.addEventListener("mousemove", move, false);
        document.addEventListener("mouseup", up, false);
      }, false);

      function move(e) {
        var x = getMouseXY(e).x - offsetX;
        var y = getMouseXY(e).y - offsetY;
        var width = document.documentElement.clientWidth - titlebar.offsetWidth;
        var height = document.documentElement.clientHeight - titlebar.offsetHeight;
        x = Math.min(Math.max(0, x), width);
        y = Math.min(Math.max(0, y), height);
        win.style.left = x + 'px';
        win.style.top = y + 'px';
      }

      function up(e) {
        document.removeEventListener("mousemove", move, false);
        document.removeEventListener("mouseup", up, false);
      }

      function getMouseXY(e) {
        var x = 0, y = 0;
        e = e || window.event;
        if (e.pageX) {
          x = e.pageX;
          y = e.pageY;
        }
        else {
          x = e.clientX + document.body.scrollLeft - document.body.clientLeft;
          y = e.clientY + document.body.scrollTop - document.body.clientTop;
        }
        return {
          x: x,
          y: y
        };
      }
      this.visible = !/float-win-hidden/.test(win.className);

      this.onHide = function () { }
      this.onShow = function () { }
    }

    show(moveToCenter) {
      if (this.visible)
        return;
      var el = this.el, self = this;
      this.visible = true;
      el.className = this.el.className.replace(/\s*(float-win-hidden\s*)+/g, " ");
      if (moveToCenter) {
        setTimeout(function () {
          self.moveTo((window.innerWidth - el.offsetWidth) / 2, (window.innerHeight - el.offsetHeight) / 2);
        }, 0);
      }

      this.onShow()
    }

    hide() {
      if (!this.visible)
        return;
      this.visible = false;
      this.el.className += " float-win-hidden";

      this.onHide()
    }

    moveTo(x, y) {
      var s = this.el.style;
      s.left = x + 'px';
      s.top = y + 'px';
    }
  }

  /**
   * Scan all elements with [win-id] attribute, then initialize FloatWin s
   *
   * @param {HTMLElement} container
   * @returns {Record<string, FloatWin>}
   */
  function scanAll(container = document) {
    let ans = {}
    for (let el of container.querySelectorAll('[win-id]')) {
      el.className += " float-win"

      let id = el.getAttribute('win-id')
      let inst = new FloatWin(el)

      ans[id] = inst
    }

    return ans
  }

  return { FloatWin, scanAll }
})
