<template>
  <div id="app">
    <RenderCanvas/>
  </div>
</template>

<style lang="scss">
#app {
  position: fixed;
  height: 100%;
  width: 100%;
}
</style>

<script>
import RenderCanvas from './components/render-canvas.vue';

export default {
  components: {
    RenderCanvas
  }
};
</script>
