import Hammerjs from 'hammerjs';
import { BabylonController } from '@/Babylon';
import PointerSession from '@/PointerSession';

const defaultHammerRecognizerNames = [
  'pan',
  'pinch',
  'rotate',
  'press',
  'swipe',
  'tap'
];

let line: BABYLON.LinesMesh | null = null;

class PointerEffect {
  private _hammer: HammerManager | null = null;
  private _target: HTMLCanvasElement | null = null;
  private _babylon: BabylonController | null = null;
  private _currentSession: PointerSession | null = null;
  private _debugCanvas: HTMLCanvasElement | null = null;

  private _debugIsDirty = false;

  public init(
    canvas: HTMLCanvasElement,
    debugCanvas: HTMLCanvasElement,
    babylon: BabylonController
  ) {
    this._target = canvas;
    this._debugCanvas = debugCanvas;
    this._babylon = babylon;

    this._hammer = new Hammerjs(this._target, {
      // NOTE: Default touchAction value 'manipulation' will cause bug in chrome
      // See: https://github.com/hammerjs/hammer.js/issues/1084
      touchAction: 'none'
    });

    defaultHammerRecognizerNames.forEach(name => {
      const recognizer = this._hammer && this._hammer.get(name);
      // Turn off all default recognizers
      if (recognizer) {
        recognizer.set({ enable: false });
      }
    });

    this._hammer.on('hammer.input', e => {
      if (e.isFirst) {
        this._currentSession = new PointerSession();
      }

      if (this._currentSession) {
        this._currentSession.addInputPoint(e);
      }

      this._debugIsDirty = true;
    });
  }

  public update() {
    if (!this._babylon || !this._babylon.isInited || !this._debugIsDirty) {
      return;
    }

    const scene = this._babylon.scene as BABYLON.Scene;
    const points: BABYLON.Vector3[] = [];
    if (this._currentSession) {
      const camera = this._babylon.camera as BABYLON.Camera;
      const pm = camera.getProjectionMatrix();
      const vm = camera.getViewMatrix();
      const cm = vm.clone().multiply(pm);
      const cmInverse = cm.invert();
      const target = this._target as HTMLCanvasElement;

      // const lastInput = this._currentSession.inputData[
      //   this._currentSession.inputData.length - 1
      // ];
      // const p = BABYLON.Vector3.TransformCoordinates(
      //   new BABYLON.Vector3(1, 1, 1),
      //   cmInverse
      // );
      // console.log(p, pm, vm);

      this._currentSession.inputData.forEach(input => {
        // transform points
        const v = new BABYLON.Vector3(
          (input.center.x * 2) / target.clientWidth - 1,
          (-1 * (input.center.y * 2)) / target.clientHeight + 1,
          0
        );
        const p = BABYLON.Vector3.TransformCoordinates(v, cmInverse);
        p.z = 0;
        points.push(p);
      });
    }

    if (line) {
      line.dispose();
    }

    line = BABYLON.Mesh.CreateLines('debugLine', points, scene);

    this.updateDebugCanvas();
  }

  public updateDebugCanvas() {
    if (!this._debugIsDirty || !this._debugCanvas) {
      return;
    }

    this._debugIsDirty = false;

    const ctx = this._debugCanvas.getContext('2d');

    if (!ctx) {
      return;
    }

    ctx.clearRect(0, 0, this._debugCanvas.width, this._debugCanvas.height);

    if (this._currentSession) {
      // Draw points
      ctx.save();
      if (this._currentSession.isEnded) {
        ctx.fillStyle = '#00FFFF';
      } else {
        ctx.fillStyle = '#FF0000';
      }
      const dotSize = 3;

      this._currentSession.inputData.forEach((input: HammerInput) => {
        ctx.fillRect(
          input.center.x - dotSize / 2,
          input.center.y - dotSize / 2,
          dotSize,
          dotSize
        );
      });
      ctx.restore();

      // Draw info
      ctx.save();

      ctx.restore();
    }
  }
}

export default new PointerEffect();
