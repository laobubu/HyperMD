(function (factory) {
  if (typeof exports === 'object' && typeof module !== 'undefined') { module.exports = factory(require('vue')) }
  else if (typeof define === 'function' && define.amd) define(['vue'], factory)
})(function (Vue) {
  'use strict'

  Vue.component("option-fieldset", {
    props: ['dist', 'title', 'doc-url'],
    template: `
    <fieldset class="option-fieldset">
      <legend>
        {{ title }}
        <a class="option-fieldset-help-icon" :href="docUrl" target="_blank">?</a>
      </legend>
      <div class="option-fieldset-help"><slot name="help-info"></slot></div>
      <slot v-bind:dist="dist"></slot>
    </fieldset>
    `
  })
})
