export default class PointerSession {
  // public static getFirstPointer(inputPoint: HammerInput) {
  //   const pointers = inputPoint.changedPointers;

  //   if (pointers.length) {

  //   } else {
  //     return null;
  //   }
  // }

  public isEnded: boolean = false;
  public inputData: HammerInput[] = [];
  public traveledDistance = 0;
  public isClick: boolean = true;

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
      const pCurrent = this._currentInputPoint
        .changedPointers[0] as PointerEvent;
      const pLast = this._lastInputPoint.changedPointers[0] as PointerEvent;
      this.traveledDistance += Math.sqrt(
        Math.pow(pCurrent.clientX - pLast.clientX, 2) +
          Math.pow(pCurrent.clientY - pLast.clientY, 2)
      );
    }

    console.log(inputPoint, this.traveledDistance);
  }
}
