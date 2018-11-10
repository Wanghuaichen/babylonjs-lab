<template>
  <div class="canvas-wrapper">
    <canvas :width="width" :height="height" ref="renderCanvas"></canvas>
    <div class="fps">FPS: {{Math.round(fps)}}</div>
  </div>
</template>

<style lang="scss">
.canvas-wrapper {
  > .fps {
    color: white;
    position: absolute;
    left: 0;
    top: 0;
  }
}
</style>


<script>
import { throttle } from 'lodash';
import babylon from '../Babylon';

export default {
  data() {
    return {
      width: 0,
      height: 0,
      fps: 0
    };
  },
  methods: {
    onResizeThrottle: throttle(function onResizeCore() {
      this.resize();
    }, 300),
    resize() {
      babylon.setSize(this.$root.$el.clientWidth, this.$root.$el.clientHeight);
    }
  },
  mounted() {
    window.addEventListener('resize', this.onResizeThrottle);

    babylon.init(this.$refs.renderCanvas);
    babylon.on('afterRender', () => {
      this.fps = babylon.engine.getFps();
    });

    this.resize();
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.onResizeThrottle);
  }
};
</script>
