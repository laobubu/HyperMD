(function (factory) {
  if (typeof exports === 'object' && typeof module !== 'undefined') { module.exports = factory(require('vue'), require('../float-win/float-win')) }
  else if (typeof define === 'function' && define.amd) define(['vue', '../float-win/float-win'], factory)
})(function (Vue, FloatWin) {
  'use strict'

  let counter = 0

  Vue.component('float-win', {
    props: ['title', 'value'],
    template: `<div class="float-win"><div win-title>{{ title }}<button win-close>×</button></div><div win-content><slot/></div></div>`,
    watch: {
      value(v) { v ? this.win.show() : this.win.hide() }
    },
    mounted() {
      var win = this.win = new FloatWin.FloatWin(this.$el)
      counter++
      win.moveTo(counter * 20, counter * 20)
      if (!this.value) win.hide()
      win.onShow = () => this.$emit('input', true)
      win.onHide = () => this.$emit('input', false)
    }
  })
})
