(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('codemirror'), require('../core')) :
  typeof define === 'function' && define.amd ? define(['exports', 'codemirror', '../core'], factory) :
  (factory((global.HyperMD = global.HyperMD || {}, global.HyperMD.InsertFile = {}),global.CodeMirror,global.HyperMD));
}(this, (function (exports,CodeMirror,core) { 'use strict';

  CodeMirror = CodeMirror && CodeMirror.hasOwnProperty('default') ? CodeMirror['default'] : CodeMirror;

  // HyperMD, copyright (c) by laobubu
  /** a spinning gif image (16x16) */
  var spinGIF = '';
  var errorPNG = '';
  /**
   * send data to url
   *
   * @param method default: "POST"
   */
  function ajaxUpload(url, form, callback, method) {
      var xhr = new XMLHttpRequest();
      var formData = new FormData();
      for (var name in form)
          { formData.append(name, form[name]); }
      xhr.onreadystatechange = function () {
          if (4 == this.readyState) {
              var ret = xhr.responseText;
              try {
                  ret = JSON.parse(xhr.responseText);
              }
              catch (err) { }
              if (/^20\d/.test(xhr.status + "")) {
                  callback(ret, null);
              }
              else {
                  callback(null, ret);
              }
          }
      };
      xhr.open(method || 'POST', url, true);
      // xhr.setRequestHeader("Content-Type", "multipart/form-data");
      xhr.send(formData);
  }
  /**
   * Default FileHandler
   *
   * accepts images, uploads to https://sm.ms and inserts as `![](image_url)`
   */
  var DefaultFileHandler = function (files, action) {
      var unfinishedCount = 0;
      var placeholderForAll = document.createElement("div");
      placeholderForAll.className = "HyperMD-insertFile-dfh-placeholder";
      action.setPlaceholder(placeholderForAll);
      /** @type {{name:string, url:string, placeholder:HTMLImageElement, blobURL:string}[]} */
      var uploads = [];
      var supportBlobURL = typeof URL !== 'undefined';
      for (var i = 0; i < files.length; i++) {
          var file = files[i];
          if (!/image\//.test(file.type))
              { continue; }
          var blobURL = supportBlobURL ? URL.createObjectURL(file) : spinGIF;
          var name = file.name.match(/[^\\\/]+\.\w+$/)[0];
          var url = null;
          var placeholder = document.createElement("img");
          placeholder.onload = action.resize; // img size changed
          placeholder.className = "HyperMD-insertFile-dfh-uploading";
          placeholder.src = blobURL;
          placeholderForAll.appendChild(placeholder);
          uploads.push({
              blobURL: blobURL, name: name, url: url, placeholder: placeholder,
          });
          unfinishedCount++;
          // now start upload image. once uploaded, `finishImage(index, url)` shall be called
          Upload_SmMs(file, uploads.length - 1);
      }
      return unfinishedCount > 0;
      function finishImage(index, url) {
          uploads[index].url = url;
          var placeholder = uploads[index].placeholder;
          placeholder.className = "HyperMD-insertFile-dfh-uploaded";
          placeholder.src = url || errorPNG;
          if (supportBlobURL)
              { URL.revokeObjectURL(uploads[index].blobURL); }
          if (--unfinishedCount === 0) {
              var texts = uploads.map(function (it) { return ("![" + (it.name) + "](" + (it.url) + ")"); });
              action.finish(texts.join(" ") + " ");
          }
      }
      function Upload_SmMs(file, index) {
          ajaxUpload('https://sm.ms/api/upload', {
              smfile: file,
              format: 'json'
          }, function (o, e) {
              var imgURL = (o && o.code == 'success') ? o.data.url : null;
              finishImage(index, imgURL);
          });
      }
  };
  var defaultOption = {
      byDrop: true,
      byPaste: true,
      fileHandler: DefaultFileHandler,
  };
  var InsertFile = function(cm) {
      var this$1 = this;

      this.byPaste = defaultOption.byPaste;
      this.byDrop = defaultOption.byDrop;
      this.fileHandler = defaultOption.fileHandler;
      this.pasteHandle = function (cm, ev) {
          if (!this$1.doInsert(ev.clipboardData || window['clipboardData']))
              { return; }
          ev.preventDefault();
      };
      this.dropHandle = function (cm, ev) {
          var self = this$1, cm = this$1.cm, result = false;
          cm.operation(function () {
              var pos = cm.coordsChar({ left: ev.clientX, top: ev.clientY });
              cm.setCursor(pos);
              result = self.doInsert(ev.dataTransfer);
          });
          if (!result)
              { return; }
          ev.preventDefault();
      };
      // Use FlipFlop to bind/unbind status
      this.ff_paste = new core.FlipFlop(
      /* ON  */ function () { return this$1.cm.on("paste", this$1.pasteHandle); }, 
      /* OFF */ function () { return this$1.cm.off("paste", this$1.pasteHandle); });
      this.ff_drop = new core.FlipFlop(
      /* ON  */ function () { return this$1.cm.on("drop", this$1.pasteHandle); }, 
      /* OFF */ function () { return this$1.cm.off("drop", this$1.pasteHandle); });
      this.cm = cm;
  };
  /**
   * upload files to the current cursor.
   *
   * @param {DataTransfer} data
   * @returns {boolean} data is accepted or not
   */
  InsertFile.prototype.doInsert = function (data) {
      var cm = this.cm;
      if (!data || !data.files || 0 === data.files.length)
          { return false; }
      var files = data.files;
      // only consider one format
      var fileHandlers = (typeof this.fileHandler === 'function') ? [this.fileHandler] : this.fileHandler;
      var handled = false;
      cm.operation(function () {
          // create a placeholder
          cm.replaceSelection(".");
          var posTo = cm.getCursor();
          var posFrom = { line: posTo.line, ch: posTo.ch - 1 };
          var placeholderContainer = document.createElement("span");
          var marker = cm.markText(posFrom, posTo, {
              replacedWith: placeholderContainer,
              clearOnEnter: false,
              handleMouseEvents: false,
          });
          var action = {
              marker: marker, cm: cm,
              finish: function (text, cursor) { return cm.operation(function () {
                  var range = marker.find();
                  var posFrom = range.from, posTo = range.to;
                  cm.replaceRange(text, posFrom, posTo);
                  marker.clear();
                  if (typeof cursor === 'number')
                      { cm.setCursor({
                          line: posFrom.line,
                          ch: posFrom.ch + cursor,
                      }); }
              }); },
              setPlaceholder: function (el) {
                  if (placeholderContainer.childNodes.length > 0)
                      { placeholderContainer.removeChild(placeholderContainer.firstChild); }
                  placeholderContainer.appendChild(el);
                  marker.changed();
              },
              resize: function() {
                  marker.changed();
              }
          };
          for (var i = 0; i < fileHandlers.length; i++) {
              var fn = fileHandlers[i];
              if (fn(files, action)) {
                  handled = true;
                  break;
              }
          }
          if (!handled)
              { marker.clear(); }
      });
      return handled;
  };
  /** HYPERMD ADDON DECLARATION */
  var AddonAlias = "insertFile";
  var AddonClassCtor = InsertFile;
  var OptionName = "hmdInsertFile";
  var getAddon = core.Addon.Getter(AddonAlias, AddonClassCtor);
  CodeMirror.defineOption(OptionName, false, function (cm, newVal) {
      var enabled = !!newVal;
      if (!enabled || newVal === true) {
          newVal = { byDrop: enabled, byPaste: enabled };
      }
      else if (typeof newVal === 'function' || newVal instanceof Array) {
          newVal = { byDrop: enabled, byPaste: enabled, fileHandler: newVal };
      }
      else if (typeof newVal !== 'object') {
          throw new Error("[HyperMD] wrong hmdInsertFile option value");
      }
      var newCfg = core.Addon.migrateOption(newVal, defaultOption);
      ///// apply config
      var inst = getAddon(cm);
      inst.ff_paste.setBool(newCfg.byPaste);
      inst.ff_drop.setBool(newCfg.byDrop);
      ///// write new values into cm
      for (var k in defaultOption)
          { inst[k] = newCfg[k]; }
  });

  exports.ajaxUpload = ajaxUpload;
  exports.DefaultFileHandler = DefaultFileHandler;
  exports.InsertFile = InsertFile;
  exports.defaultOption = defaultOption;
  exports.getAddon = getAddon;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
