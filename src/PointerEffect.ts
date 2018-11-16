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

const MIN_SWIPE_THRESHOLD = 10;
const MIN_SWIPE_SEG = 40;
// const MIN_SWIPE_SEG = 100;
const INIT_SWIPE_WIDTH = 30;
// const INIT_SWIPE_WIDTH = 90;
const SWIPE_SHRINK = 0.005;
// const SWIPE_SHRINK = 0.00001;
// const SWIPE_SHRINK = 0.0005;

class PointerEffect {
  private _hammer: HammerManager | null = null;
  private _target: HTMLCanvasElement | null = null;
  private _babylon: BabylonController | null = null;
  private _currentSession: PointerSession | null = null;
  private _debugCanvas: HTMLCanvasElement | null = null;
  private _isDirty: boolean = false;

  // runtime data
  private _isClick: boolean = false;
  private _clickCenter: BABYLON.Vector2 | null = null;
  private _line: BABYLON.LinesMesh | null = null;
  private _mesh: BABYLON.Mesh | null = null;
  private _material: BABYLON.StandardMaterial | null = null;
  private _filteredPoints: any[] = [];
  private _tailIndex = 0;
  private _headIndex = 0;

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
      if (!this._currentSession || e.isFirst) {
        this._currentSession = new PointerSession();
      }

      this._currentSession.addInputPoint(e);

      if (e.isFirst) {
        this._onSessionStart(this._currentSession);
      }

      this._onSessionUpdate(this._currentSession);

      if (e.isFinal) {
        this._onSessionEnd(this._currentSession);
      }

      this._isDirty = true;
    });

    this._material = new BABYLON.StandardMaterial('simple-material', this
      ._babylon.scene as BABYLON.Scene);
    // this._material.diffuseColor = new BABYLON.Color3(1, 0, 0);
    this._material.diffuseTexture = new BABYLON.Texture(
      require('@/assets/uv-test-6.png'),
      this._babylon.scene as BABYLON.Scene
    );
    this._material.backFaceCulling = true;
    // this._material.wireframe = true;
  }

  public update() {
    if (!this._babylon || !this._babylon.isInited) {
      return;
    }

    // Clear old mesh
    if (this._mesh) {
      this._mesh.dispose();
      this._mesh = null;
    }

    // If no point with life, return
    if (
      !this._filteredPoints.length ||
      this._tailIndex === this._filteredPoints.length - 1
    ) {
      return;
    }

    const engine = this._babylon.engine as BABYLON.Engine;
    const scene = this._babylon.scene as BABYLON.Scene;
    const camera = this._babylon.camera as BABYLON.Camera;

    const deltaTime = engine.getDeltaTime();
    // Convert to 2D matrices
    const pm = camera.getProjectionMatrix();
    const vm = camera.getViewMatrix();
    const cmInverse = vm
      .clone()
      .multiply(pm)
      .invert();

    const lifeDelta = deltaTime * SWIPE_SHRINK;

    this._mesh = new BABYLON.Mesh('swipe', scene);
    this._mesh.material = this._material;
    this._mesh.renderingGroupId = 2;
    this._mesh.visibility = 0.9999;

    const positions: number[] = [];
    const indices: number[] = [];
    const uvs: number[] = [];
    const normals: number[] = [];

    if (this._tailIndex <= this._filteredPoints.length - 2) {
      // At least 2 points to form a swipe effect
      this._filteredPoints.forEach((point, index: number) => {
        point.meshPoints = [];

        if (index < this._tailIndex) {
          return;
        }

        if (index === this._tailIndex) {
          // end point
          // 0/1 ----> 2
          // point 0 & point 1
          let px = point.x;
          let py = point.y;
          point.meshPoints.push(px, py, 0);
          let v = this.transformToCamera(px, py, cmInverse);
          positions.push(v.x, v.y, 0); // 0
          positions.push(v.x, v.y, 0); // 1

          // point 2
          const nextPoint = this._filteredPoints[index + 1];
          px = nextPoint.x;
          py = nextPoint.y;
          point.meshPoints.push(px, py, 0);
          v = this.transformToCamera(px, py, cmInverse);
          positions.push(v.x, v.y, 0);

          // Tail points uv
          uvs.push(/* 0 */ 1, 1, /* 1 */ 1, 0, /* 2 */ 0, 0.5);
        } else if (index > this._tailIndex) {
          // middle point
          /**
           * x
           * |
           * |
           * |
           * |
           * x+1
           */
          const normal = point.normal as BABYLON.Vector2;
          // point x
          let px = point.x + (normal.x * (INIT_SWIPE_WIDTH * point.life)) / 2;
          let py = point.y + (normal.y * (INIT_SWIPE_WIDTH * point.life)) / 2;
          point.meshPoints.push(px, py, 0);
          const v1 = this.transformToCamera(px, py, cmInverse);
          positions.push(v1.x, v1.y, 0);

          // point x+1
          px = point.x - (normal.x * (INIT_SWIPE_WIDTH * point.life)) / 2;
          py = point.y - (normal.y * (INIT_SWIPE_WIDTH * point.life)) / 2;
          point.meshPoints.push(px, py, 0);
          const v2 = this.transformToCamera(px, py, cmInverse);
          positions.push(v2.x, v2.y, 0);

          const i = index - this._tailIndex;

          // Mid points uv
          if (i % 2 !== 0) {
            uvs.push(0, 1, 0, 0);
          } else {
            uvs.push(1, 1, 1, 0);
          }

          if (index === this._tailIndex + 1) {
            // For tail
            indices.push(
              // Triangle upper
              0,
              3,
              2,
              // middle dummy
              0,
              2,
              1,
              // Triangle lower
              1,
              2,
              4
            );
          } else {
            indices.push(
              // Triangle 1
              i * 2 - 1,
              i * 2 + 1,
              i * 2,
              // Triangle 2
              i * 2,
              i * 2 + 1,
              i * 2 + 2
            );
          }

          // Add head
          if (index === this._filteredPoints.length - 1) {
            const pointV = new BABYLON.Vector2(-normal.y, normal.x);

            // Prevent artifacts
            // if (!point.isDetermined) {
            //   const lastDeterminedPoint = this._filteredPoints[index - 1];

            //   if (
            //     lastDeterminedPoint &&
            //     lastDeterminedPoint.normal.length() > 0
            //   ) {
            //     const lastPointV = new BABYLON.Vector2(
            //       -lastDeterminedPoint.normal.y,
            //       lastDeterminedPoint.normal.x
            //     );
            //     // const MIN_SWIPE_SEG
            //     const headTraveledProgress =
            //       (point.traveledDistance -
            //         lastDeterminedPoint.traveledDistance) /
            //       MIN_SWIPE_SEG;

            //     // console.log(headTraveledProgress);

            //     pointV = new BABYLON.Vector2(
            //       lastPointV.x * (1 - headTraveledProgress) +
            //         pointV.x * headTraveledProgress,
            //       lastPointV.y * (1 - headTraveledProgress) +
            //         pointV.y * headTraveledProgress
            //     );

            //     if (headTraveledProgress <= 1e-5) {
            //       console.log('error', pointV, lastPointV, pointV.length());
            //     }
            //   }
            // }

            const vh1 = this.transformToCamera(
              point.x +
                ((pointV.x * (INIT_SWIPE_WIDTH * point.life)) / 2) * 2.5,
              point.y +
                ((pointV.y * (INIT_SWIPE_WIDTH * point.life)) / 2) * 2.5,
              cmInverse
            );
            // const vh2 = this.transformToCamera(
            //   point.x - (pointV.x * (INIT_SWIPE_WIDTH * point.life)) / 2,
            //   point.y - (pointV.y * (INIT_SWIPE_WIDTH * point.life)) / 2,
            //   cmInverse
            // );

            // middle point
            positions.push((v1.x + v2.x) / 2, (v1.y + v2.y) / 2, 0);

            // upper head
            positions.push(vh1.x, vh1.y, 0);

            // lower head
            positions.push(vh1.x, vh1.y, 0);

            if (i % 2 !== 0) {
              uvs.push(0, 0.5, 1, 1, 1, 0);
            } else {
              uvs.push(1, 0.5, 0, 1, 0, 0);
            }
            // vs.push(0, 0, 0, 0, 0, 0);

            indices.push(
              // Upper triangle
              i * 2 + 3,
              i * 2 + 1,
              i * 2 + 4,
              // middle dummy
              i * 2 + 3,
              i * 2 + 4,
              i * 2 + 5,
              // lower triangle
              i * 2 + 3,
              i * 2 + 5,
              i * 2 + 2
            );
          }
        }
      });

      for (let i = this._tailIndex; i < this._filteredPoints.length; i++) {
        const point = this._filteredPoints[i];
        point.life -= lifeDelta;
        if (point.life < 0) {
          point.life = 0;
          this._tailIndex = i;
        }
      }
    }

    BABYLON.VertexData.ComputeNormals(positions, indices, normals);
    // console.log(positions.length / 3, normals);
    // (BABYLON.VertexData as any)._ComputeSides(
    //   BABYLON.Mesh,
    //   positions,
    //   indices,
    //   normals,
    //   uvs
    // );

    const vertexData = new BABYLON.VertexData();
    vertexData.positions = positions;
    vertexData.indices = indices;
    vertexData.normals = normals;
    vertexData.uvs = uvs;
    vertexData.applyToMesh(this._mesh);

    // this.updateDebugCanvas();
  }

  public updateDebugCanvas() {
    if (!this._isDirty || !this._debugCanvas) {
      return;
    }

    this._isDirty = false;

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
      ctx.strokeStyle = 'red';
      const dotSize = 3;

      this._filteredPoints.forEach((input: any, index: number) => {
        const meshPoints = input.meshPoints;
        const meshPointCount = input.meshPoints.length / 3;

        for (let i = 0; i < meshPointCount; i++) {
          ctx.fillRect(
            meshPoints[i * 3] - dotSize / 2,
            meshPoints[i * 3 + 1] - dotSize / 2,
            dotSize,
            dotSize
          );
        }
        // ctx.fillRect(
        //   input.x - dotSize / 2,
        //   input.y - dotSize / 2,
        //   dotSize,
        //   dotSize
        // );

        const normal = input.normal as BABYLON.Vector2;

        // draw normal
        if (input.life > 0) {
          ctx.beginPath();
          ctx.moveTo(input.x, input.y);
          ctx.lineTo(
            input.x + ((normal.x * INIT_SWIPE_WIDTH) / 2) * input.life,
            input.y + ((normal.y * INIT_SWIPE_WIDTH) / 2) * input.life
          );
          ctx.stroke();
        }
      });
      ctx.restore();

      // Draw info
      ctx.save();

      ctx.restore();
    }
  }

  public transformToCamera(x: number, y: number, m: BABYLON.Matrix) {
    const target = this._target as HTMLCanvasElement;
    // (meshPoints[i * 3] * 2) / target.clientWidth - 1,
    //  (-1 * (meshPoints[i * 3 + 1] * 2)) / target.clientHeight + 1,
    const v = new BABYLON.Vector3(
      (x * 2) / target.clientWidth - 1,
      (-y * 2) / target.clientHeight + 1,
      0
    );
    return BABYLON.Vector3.TransformCoordinates(v, m);
  }

  private _onSessionStart(session: PointerSession) {
    this._isClick = true;
    this._filteredPoints = [];
    this._tailIndex = 0;
    this._headIndex = 0;
  }

  // Process data to do effect
  private _onSessionUpdate(session: PointerSession) {
    if (!this._currentSession) {
      return;
    }

    // determine if it is a click or swipe
    if (this._currentSession.traveledDistance > MIN_SWIPE_THRESHOLD) {
      this._isClick = false;

      // do some switch stuff
      // console.log('swipe');
    }

    /**
     * Filter points:
     * The first and the last (2 ends) are always added. Internal points only add
     * when the length is exceed a certain threshold
     */
    const inputDataList = this._currentSession.inputData;
    const currentInput = inputDataList[inputDataList.length - 1];
    const filteredPoint = {
      x: currentInput.center.x,
      y: currentInput.center.y,
      input: currentInput,
      traveledDistance: this._currentSession.traveledDistance,
      isStart: false,
      isDetermined: false,
      normal: new BABYLON.Vector2(0, 0),
      life: 1,
      meshPoints: [],
      isMeshPointsDirty: false
    };
    let lastFilteredPoint = null;
    let lastDeterminedPoint = null;

    // start point
    if (!this._filteredPoints.length) {
      filteredPoint.isStart = true;
      filteredPoint.isDetermined = true;
      filteredPoint.life = 0;
      this._filteredPoints.push(filteredPoint);
    } else {
      lastFilteredPoint = this._filteredPoints[this._filteredPoints.length - 1];
    }

    // update lastFiltered to current if last is not long enough
    if (!filteredPoint.isStart && lastFilteredPoint) {
      if (lastFilteredPoint.isDetermined) {
        lastDeterminedPoint = lastFilteredPoint;
      } else {
        lastDeterminedPoint = this._filteredPoints[
          this._filteredPoints.length - 2
        ];
      }

      const distanceDelta =
        filteredPoint.traveledDistance - lastDeterminedPoint.traveledDistance;

      filteredPoint.isDetermined = distanceDelta > MIN_SWIPE_SEG;

      if (lastFilteredPoint.isDetermined) {
        /**
         *  NOTE: If last point is just add, and a very close new point added,
         * the distance delta will be 0, here is to prevent this
         */
        if (distanceDelta > MIN_SWIPE_SEG / 10) {
          this._filteredPoints.push(filteredPoint);
        }
      } else {
        // TODO: Smooth head point if it is to short
        // const traveledPercentage = distanceDelta / MIN_SWIPE_SEG;

        // if (lastDeterminedPoint && !lastDeterminedPoint.isStart) {
        //   filteredPoint.x =
        //     lastDeterminedPoint.x * (1 - traveledPercentage) +
        //     filteredPoint.x * traveledPercentage;
        //   filteredPoint.y =
        //     lastDeterminedPoint.y * (1 - traveledPercentage) +
        //     filteredPoint.y * traveledPercentage;
        // }
        this._filteredPoints[
          this._filteredPoints.length - 1 /* last one */
        ] = filteredPoint;
      }
    }

    // TODO: smooth path

    /**
     * Make normals for swipe
     * Normal defines the width expension for the swipe line
     */
    // only last 2 points normals will be affected
    const currentFP = this._filteredPoints[this._filteredPoints.length - 1];
    const lastFP = this._filteredPoints[this._filteredPoints.length - 2];

    if (currentFP && lastFP) {
      const currentV = new BABYLON.Vector2(
        currentFP.x - lastFP.x,
        currentFP.y - lastFP.y
      );

      // Get perpendicular counter-clockwise, as current normal
      const currentFPNormal = currentFP.normal as BABYLON.Vector2;
      currentFPNormal.set(currentV.y, -currentV.x).normalize();

      // // last normal correction
      // const lastFPNormal = lastFP.normal as BABYLON.Vector2;

      // if (lastFPNormal.length() > 0.001) {
      //   // If it is not the start point

      // }
    }
  }

  private _onSessionEnd(session: PointerSession) {
    //
  }
}

export default new PointerEffect();
