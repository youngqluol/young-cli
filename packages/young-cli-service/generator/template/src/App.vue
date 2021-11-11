<template>
  <div class="app-page">
    <HelloWorld />
  </div>
</template>

<script>
import HelloWorld from '@/components/HelloWorld'
export default {
  components: {
    HelloWorld
  },
  setup() {
  }
};
</script>

<style lang="less" scoped>
  .app-page {
    font-size: 0.3rem;
    position: relative;
    width: 100%;
    height: auto;
  }
</style>
