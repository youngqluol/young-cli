---
extend: 'young-cli-service/generator/template/src/App.vue'
replace:
  - !!js/regexp /<template>[^]*?<\/template>/
  - !!js/regexp /\n<script>[^]*?<\/script>\n/
---

<%# REPLACE %>
<template>
  <div class="app-page">
    <router-view></router-view>
  </div>
</template>
<script>
<%# END_REPLACE %>

<%# REPLACE %>
<script>
export default {
  setup() {
  }
};
</script>
<%# END_REPLACE %>