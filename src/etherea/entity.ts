// =============================-===--======- -    -
// Floating-Origin Entity
//
// Put any objects you want to become floating-origin
// as children of an Entity.
//
// You can have as many Entities as you want,
// but this is better if you space them, objects
// close to each other should be inside an unique Entity.
//
// This was originally written by Vander R. N. Dias,
// for Babylon.js 5.x
// ===========================-===--======- -    -

import * as BABYLON from 'babylonjs';
import { OriginCamera } from './origin_camera';

// Out floating-origin Entity
export class Entity extends BABYLON.TransformNode {
    // you must use the doublepos property instead of position directly
    private _doublepos: BABYLON.Vector3 = new BABYLON.Vector3();
    public get doublepos() { return this._doublepos; }
    public set doublepos(pos: BABYLON.Vector3) { this._doublepos.copyFrom(pos); }

    constructor(name: string, scene: BABYLON.Scene) {
        super(name, scene);
    }

    // This is called automatically by OriginCamera
    public update(cam: OriginCamera): void {
        this.position = this.doublepos.subtract(cam.doublepos);
    }
}
