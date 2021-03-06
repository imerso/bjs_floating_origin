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

// Our floating-origin OriginCamera
export class OriginCamera extends BABYLON.UniversalCamera {
    private _list: Array<Entity> = new Array<Entity>();

    // double precision position
    // you must use the doublepos to change its position, instead of position directly.
    private _doublepos: BABYLON.Vector3 = new BABYLON.Vector3();
    public get doublepos() { return this._doublepos; }
    public set doublepos(pos: BABYLON.Vector3) { this._doublepos.copyFrom(pos); }

    // double precision target
    // you must use the doubletgt to change it, instead of setTarget() directly.
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
            // then clear the camera movement (move camera back to origin);
            // this would not be necessary if we moved the camera
            // ouselves from this class, but for now we're
            // leaving that responsibility for the original UniversalCamera,
            // so when it moves from origin, we must update our doublepos
            // and reset the UniversalCamera back to origin.
            this.doublepos.addInPlace(this.position);
            this.position.set(0, 0, 0);

            // iterate through all registered Entities
            for (let i=0; i<this._list.length; i++)
            {
                // update the Entity
                this._list[i].update(this);
            }
        });
    }

    // Register an Entity
    add(entity: Entity): void {
        this._list.push(entity);
    }
}
