(function (factory) {
  if (typeof exports === 'object' && typeof module !== 'undefined') { module.exports = factory(require('vue')) }
  else if (typeof define === 'function' && define.amd) define(['vue'], factory)
})(function (Vue) {
  'use strict'

  Vue.component("option-input", {
    props: ['dist', 'member'],
    computed: {
      value() { return this.dist[this.member] },
      valueType() { return typeof this.value },
    },
    methods: {
      onChange2(ev) { this.dist[this.member] = ev.target.value },
    },
    template: `
    <label v-if="valueType === 'boolean'"><input v-model="dist[member]" type="checkbox">{{ member }}</label>
    <label v-else-if="valueType === 'string'">{{ member }} <input :value="dist[member]" @change="onChange2"></label>
    <code v-else>{{ value }}</code>
    `
  })
})
