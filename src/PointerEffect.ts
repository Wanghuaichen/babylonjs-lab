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

class PointerEffect {
  private _hammer: HammerManager | null = null;
  private _target: HTMLCanvasElement | null = null;
  private _currentSession: PointerSession | null = null;
  private _debugCanvas: HTMLCanvasElement | null = null;

  private _debugIsDirty = false;

  public init(
    canvas: HTMLCanvasElement,
    debugCanvas: HTMLCanvasElement,
    controller: BabylonController
  ) {
    this._target = canvas;
    this._debugCanvas = debugCanvas;

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

  public updateDebugCanvas() {
    if (!this._debugIsDirty || !this._debugCanvas) {
      return;
    }
    const ctx = this._debugCanvas.getContext('2d');

    if (!ctx) {
      return;
    }

    ctx.clearRect(0, 0, this._debugCanvas.width, this._debugCanvas.height);

    if (this._currentSession) {
      ctx.save();

      if (this._currentSession.isEnded) {
        ctx.fillStyle = '#FFFFFF';
      } else {
        ctx.fillStyle = '#FF0000';
      }

      this._currentSession.inputData.forEach((input: HammerInput) => {
        ctx.fillRect(input.center.x, input.center.y, 1.5, 1.5);
      });
    }
  }
}

export default new PointerEffect();
