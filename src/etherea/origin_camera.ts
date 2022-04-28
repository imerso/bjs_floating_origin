// =============================-===--======- -    -
// Floating-Origin Camera
//
// This camera is based on UniversalCamera,
// but it acts differently. It is fixed
// at world's origin (0, 0, 0),
// and it moves all Entities added to its list
// around the origin, mitigating floating-point
// imprecisions at places with huge coordinates.
//
// This was originally written by Vander R. N. Dias,
// for Babylon.js 5.x
// ===========================-===--======- -    -

import * as BABYLON from 'babylonjs';
import { Entity } from './entity';

export class OriginCamera extends BABYLON.UniversalCamera {
    private _list: Array<Entity> = new Array<Entity>();
    private _tmppos: BABYLON.Vector3 = new BABYLON.Vector3();

    // double precision position
    private _doublepos: BABYLON.Vector3 = new BABYLON.Vector3();
    public get doublepos() { return this._doublepos; }
    public set doublepos(pos: BABYLON.Vector3) { this._doublepos.copyFrom(pos); }

    // double precision target
    private _doubletgt: BABYLON.Vector3 = new BABYLON.Vector3();
    public get doubletgt() { return this._doubletgt; }
    public set doubletgt(tgt: BABYLON.Vector3) {
        this._doubletgt.copyFrom(tgt);
        this.setTarget(this._doubletgt.subtract(this._doublepos));
    }

    // Constructor
    constructor(name: string, position: BABYLON.Vector3, scene: BABYLON.Scene) {
        super(name, BABYLON.Vector3.Zero(), scene);
        this.doublepos = position;

        this._scene.onBeforeActiveMeshesEvaluationObservable.add(() => {
            // accumulate any movement on current frame
            // to the double precision position,
            // then clear the camera movement (move camera back to origin)
            this.doublepos.addInPlace(this.position);
            this.position.set(0, 0, 0);

            for (let i=0; i<this._list.length; i++)
            {
                this._list[i].update(this);
            }
        });
    }

    add(entity: Entity): void {
        this._list.push(entity);
    }
}
