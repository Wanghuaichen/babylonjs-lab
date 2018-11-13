<template>
  <div class="canvas-wrapper">
    <canvas ref="renderCanvas"></canvas>
    <canvas id="debugCanvas" :width="width" :height="height" ref="debugCanvas"></canvas>
    <div class="fps">{{Math.round(fps)}} FPS</div>
  </div>
</template>

<style lang="scss">
.canvas-wrapper {
  > .fps {
    color: black;
    position: absolute;
    left: 0;
    top: 0;
  }

  > #debugCanvas {
    position: absolute;
    left: 0;
    top: 0;
    pointer-events: none;
  }
}
</style>


<script>
import { throttle } from 'lodash';
import babylon from '@/Babylon';
import pointerEffect from '@/PointerEffect';

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
      this.width = this.$root.$el.clientWidth;
      this.height = this.$root.$el.clientHeight;
      babylon.setSize(this.width, this.height);
    },
    onCanvasKeyup(e) {
      switch (e.key) {
        case 'd': {
          babylon.toggleInspector();
        }
      }
    }
  },
  mounted() {
    window.addEventListener('resize', this.onResizeThrottle);

    babylon.init(this.$refs.renderCanvas);
    babylon.on('beforeRender', () => {
      pointerEffect.update();
    });
    babylon.on('afterRender', () => {
      this.fps = babylon.engine.getFps();
    });

    pointerEffect.init(
      this.$refs.renderCanvas,
      this.$refs.debugCanvas,
      babylon
    );

    this.$refs.renderCanvas.addEventListener('keyup', this.onCanvasKeyup);

    this.resize();
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.onResizeThrottle);
  }
};
</script>
