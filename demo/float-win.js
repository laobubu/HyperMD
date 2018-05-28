function initFloatWin(id) {
  var win = document.getElementById(id)

  /** @type {HTMLDivElement} */
  var titlebar = win.querySelector('.float-win-title');
  titlebar.addEventListener("selectstart", function () { return false }, false)

  var boxX, boxY, mouseX, mouseY, offsetX, offsetY;

  titlebar.addEventListener("mousedown", function (e) {
    boxX = win.offsetLeft;
    boxY = win.offsetTop;
    mouseX = parseInt(getMouseXY(e).x);
    mouseY = parseInt(getMouseXY(e).y);
    offsetX = mouseX - boxX;
    offsetY = mouseY - boxY;

    document.addEventListener("mousemove", move, false)
    document.addEventListener("mouseup", up, false)
  }, false)

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
    document.removeEventListener("mousemove", move, false)
    document.removeEventListener("mouseup", up, false)
  }

  function getMouseXY(e) {
    var x = 0, y = 0;
    e = e || window.event;
    if (e.pageX) {
      x = e.pageX;
      y = e.pageY;
    } else {
      x = e.clientX + document.body.scrollLeft - document.body.clientLeft;
      y = e.clientY + document.body.scrollTop - document.body.clientTop;
    }
    return {
      x: x,
      y: y
    };
  }

  var inst = {
    el: win,
    visible: !/float-win-hidden/.test(win.className),
    show: function () { inst.visible = true; win.className = win.className.replace(/\s*(float-win-hidden\s*)+/g, " "); },
    hide: function () { inst.visible = false; win.className += " float-win-hidden"; },
    moveTo: function (x, y) { win.style.left = x + 'px'; win.style.top = y + 'px'; },
  }
  return inst
}
