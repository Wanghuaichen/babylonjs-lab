export default class PointerSession {
  // public static getFirstPointer(inputPoint: HammerInput) {
  //   const pointers = inputPoint.changedPointers;

  //   if (pointers.length) {

  //   } else {
  //     return null;
  //   }
  // }

  public static getDistance(x1: number, y1: number, x2: number, y2: number) {
    return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
  }

  public isEnded: boolean = false;
  public inputData: HammerInput[] = [];
  public traveledDistance = 0;
  public lastDistance = 0;

  public get currentInputPoint() {
    return this._currentInputPoint;
  }

  private _lastInputPoint: HammerInput | null = null;
  private _currentInputPoint: HammerInput | null = null;
  private _startPoint: HammerInput | null = null;
  private _endPoint: HammerInput | null = null;

  public addInputPoint(inputPoint: HammerInput) {
    this.inputData.push(inputPoint);

    if (this._currentInputPoint) {
      this._lastInputPoint = this._currentInputPoint;
    }
    this._currentInputPoint = inputPoint;

    if (this._currentInputPoint.isFirst) {
      this._startPoint = this._currentInputPoint;
    }

    if (this._currentInputPoint.isFinal) {
      this._endPoint = this._currentInputPoint;
      this.isEnded = true;
    }

    if (this._currentInputPoint && this._lastInputPoint) {
      const pCurrent = this._currentInputPoint.center;
      const pLast = this._lastInputPoint.center;
      this.lastDistance = PointerSession.getDistance(
        pCurrent.x,
        pCurrent.y,
        pLast.x,
        pLast.y
      );
      this.traveledDistance += this.lastDistance;
    }

    // console.log(inputPoint, this.traveledDistance);
  }
}
