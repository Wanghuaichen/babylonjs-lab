import 'babylonjs-inspector';
import 'babylonjs-materials';

export class BabylonController {
  private _events: { [name: string]: any } = {};
  private _canvas: HTMLCanvasElement | null = null;
  private _camera: null | BABYLON.FreeCamera = null;
  private _engine: null | BABYLON.Engine = null;
  private _scene: null | BABYLON.Scene = null;
  private _isInited: boolean = false;
  private _isRenderLoopStarted: boolean = false;
  private _bindedRenderFn: null | (() => any) = null;
  private _isInspectorOpen: boolean = false;

  public get camera() {
    return this._camera;
  }

  public get engine() {
    return this._engine;
  }

  public get scene() {
    return this._scene;
  }

  public get isInited() {
    return this._isInited;
  }

  public get isRenderLoopStarted() {
    return this._isRenderLoopStarted;
  }

  public init(canvas: HTMLCanvasElement) {
    this._canvas = canvas;
    this._engine = new BABYLON.Engine(canvas, true);
    this._scene = new BABYLON.Scene(this._engine);

    this._scene.clearColor = new BABYLON.Color4(1, 1, 1, 1);
    this._scene.useRightHandedSystem = true;

    this._camera = new BABYLON.FreeCamera(
      'main',
      new BABYLON.Vector3(0, 0, -1000),
      this._scene
    );
    this._camera.setTarget(BABYLON.Vector3.Zero());
    this._camera.upVector.set(0, -1, 0);
    this._camera.mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA;

    this.makeAxis(100);

    this.setSize(canvas.clientWidth, canvas.clientHeight);
    this.startRenderLoop();

    this._isInited = true;
  }

  public setSize(width: number, height: number) {
    if (this._engine && this._camera) {
      this._engine.setSize(width, height);

      this._camera.orthoLeft = -width / 2;
      this._camera.orthoRight = width / 2;
      this._camera.orthoTop = height / 2;
      this._camera.orthoBottom = -height / 2;
    }
  }

  public startRenderLoop() {
    if (!this._isRenderLoopStarted && this._engine && this._scene) {
      this._bindedRenderFn = this._renderFn.bind(this);
      this._engine.runRenderLoop(this._bindedRenderFn as (() => any));
    }
  }

  public stopRenderLoop() {
    if (this._isRenderLoopStarted && this._engine && this._scene) {
      this._engine.stopRenderLoop(this._renderFn);
      this._bindedRenderFn = null;
    }
  }

  // Utils
  public makeAxis(size: number) {
    const axisX = BABYLON.Mesh.CreateLines(
      'axisX',
      [
        BABYLON.Vector3.Zero(),
        new BABYLON.Vector3(size, 0, 0),
        new BABYLON.Vector3(size * 0.95, 0.05 * size, 0),
        new BABYLON.Vector3(size, 0, 0),
        new BABYLON.Vector3(size * 0.95, -0.05 * size, 0)
      ],
      this._scene
    );
    axisX.enableEdgesRendering();
    axisX.edgesWidth = 3.0;
    axisX.edgesColor = new BABYLON.Color4(1, 0, 0, 1);

    const axisY = BABYLON.Mesh.CreateLines(
      'axisY',
      [
        BABYLON.Vector3.Zero(),
        new BABYLON.Vector3(0, size, 0),
        new BABYLON.Vector3(-0.05 * size, size * 0.95, 0),
        new BABYLON.Vector3(0, size, 0),
        new BABYLON.Vector3(0.05 * size, size * 0.95, 0)
      ],
      this._scene
    );
    axisY.enableEdgesRendering();
    axisY.edgesWidth = 3.0;
    axisY.edgesColor = new BABYLON.Color4(0, 1, 0, 1);

    const axisZ = BABYLON.Mesh.CreateLines(
      'axisZ',
      [
        BABYLON.Vector3.Zero(),
        new BABYLON.Vector3(0, 0, size),
        new BABYLON.Vector3(0, -0.05 * size, size * 0.95),
        new BABYLON.Vector3(0, 0, size),
        new BABYLON.Vector3(0, 0.05 * size, size * 0.95)
      ],
      this._scene
    );
    axisZ.enableEdgesRendering();
    axisZ.edgesWidth = 3.0;
    axisZ.edgesColor = new BABYLON.Color4(0, 0, 1, 1);
  }

  public toggleInspector() {
    if (!this._scene) {
      return;
    }
    if (!this._isInspectorOpen) {
      this._scene.debugLayer.show();
      this._isInspectorOpen = true;
    } else {
      this._scene.debugLayer.hide();
      this._isInspectorOpen = false;
    }
  }

  public on(eventName: string, cb: () => any) {
    if (
      !this._events[eventName] ||
      !Array.isArray(this._events[eventName].handlers)
    ) {
      this._events[eventName] = {
        handlers: []
      };
    }

    if (this._events[eventName].handlers.indexOf(cb) === -1) {
      this._events[eventName].handlers.push(cb);
    }

    return cb;
  }
  public off(eventName: string, cb?: () => any) {
    if (
      this._events[eventName] &&
      Array.isArray(this._events[eventName].handlers)
    ) {
      const handlers = this._events[eventName].handlers as Array<() => any>;
      if (!cb) {
        this._events[eventName].handlers.length = 0;
      } else {
        const index = handlers.indexOf(cb);

        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    }
  }
  public emit(eventName: string, ...data: any[]) {
    if (
      this._events[eventName] &&
      Array.isArray(this._events[eventName].handlers)
    ) {
      const cbList = this._events[eventName].handlers.slice() as Array<
        () => any
      >;

      cbList.forEach(cb => {
        (cb as (() => any)).apply(undefined, data);
      });
    }
  }

  private _renderFn() {
    this.emit('beforeRender');
    if (this._scene) {
      this._scene.render();
    }
    this.emit('afterRender');
  }
}

const controller = new BabylonController();

export default controller;
