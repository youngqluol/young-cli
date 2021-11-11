<template>
  <div class="main-page">
    <p>This is Home page</p>
    <HelloWorld />
    <div class="img2"></div>
    <router-link to="/about">Go to ahout</router-link>
    <button @click="addNum">点我：{{ num }}</button>
  </div>
</template>
<script>
import { ref, reactive, toRefs } from 'vue'
import HelloWorld from '@/components/HelloWorld'

export default {
  components: {
    HelloWorld
  },
  setup() {
    const num = ref(0)
    const obj = reactive({ title: 1 })
    return {
      num,
      ...toRefs(obj),
      addNum: () => num++
    }
  }
}
</script>
<style lang="less" scoped>
    .main-page {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      margin-top: 2rem;
      .img2 {
        width: 3rem;
        height: 3rem;
        background-image: url('../assets/logo.png');
        background-size: 3rem 3rem;
      }
    }
</style>
