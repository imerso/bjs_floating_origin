// =============================-===--======- -    -
// Etherea for Babylon.js
//
// Main Game Class
//
// by imerso
// ===========================-===--======- -    -

import * as BABYLON from 'babylonjs';
import { float, int } from 'babylonjs';
import { OriginCamera } from './etherea/origin_camera';
import { Entity } from './etherea/entity';

// ======================================
// performance tweakers
// ======================================
//
// hardware scale will affect the
// final rendering resolution;
// 1 = default scale (normal speed)
// above 1 = lower resolution (faster)
// below 1 = higher resolution (slower)
//
// hdr and shadows are very expensive on mobiles;
// depending on project you might want to have
// them enabled and render at a lower resolution
// to compensate.
//
let USE_DEBUG_LAYER: boolean = false;              // enable debug inspector?
let USE_CUSTOM_LOADINGSCREEN: boolean = false;    // enable custom loading screen?
let HW_SCALE_NORMAL: float = 1;                  // scale in non-vr mode
let HW_SCALE_VR: float = 1;                      // scale in vr mode
let USE_ANTIALIAS: boolean = true;               // enable antialias?
let USE_HDR: boolean = true;                     // enable hdr?
let USE_GLOW: boolean = false;                    // enable glow?
let USE_SHADOWS: boolean = false;                 // enable shadows?
// ======================================


//=============================================
// Replace the default Babylonjs loading screen
// with our own loading screen.

// We can only show or hide the loading ui
interface ILoadingScreen {
    displayLoadingUI: () => void;
    hideLoadingUI: () => void;
    loadingUIBackgroundColor: string;
}

// Just show or hide the div with "Loading..." message
class CustomLoadingScreen implements ILoadingScreen {
    public loadingUIBackgroundColor: string
    constructor(public loadingUIText: string) { }
    public displayLoadingUI() {
        document.getElementById("frontdiv").style.visibility = 'visible';
    }

    public hideLoadingUI() {
        document.getElementById("frontdiv").style.visibility = 'hidden';
    }
}
//=============================================


// Main game class
export class Game {

    private _loadingScreen: CustomLoadingScreen = null;
    private _fps: HTMLElement;
    private _canvas: HTMLCanvasElement;
    private _engine: BABYLON.Engine;
    private _scene: BABYLON.Scene;
    private _cameras: OriginCamera[];
    private _curcamera: int = 0;
    private _light1: BABYLON.Light;
    private _light2: BABYLON.ShadowLight;
    private _shadowgen: BABYLON.ShadowGenerator;
    private _xrhelper: BABYLON.WebXRDefaultExperience;
    private _grounds: BABYLON.AbstractMesh[] = new Array<BABYLON.AbstractMesh>();
    private _planetPos: BABYLON.Vector3 = new BABYLON.Vector3(0, 0, 128000);
    private _hangarPos: BABYLON.Vector3 = this._planetPos.add(new BABYLON.Vector3(33500, 100, 0));
    private _blinking: BABYLON.Mesh;
    private _on: boolean;
    private _frame: int = 0;


    // Initialization, gets canvas and creates engine
    constructor(canvasElement: string) {
        // lower rendering quality on mobile
        if (this.isMobileDevice()) {
            USE_HDR = false;
            USE_ANTIALIAS = false;
            USE_GLOW = true;
            USE_SHADOWS = false;
            HW_SCALE_NORMAL = 1;
            HW_SCALE_VR = 1;
        }

        this._canvas = <HTMLCanvasElement>document.getElementById(canvasElement);
        this._engine = new BABYLON.Engine(this._canvas, USE_ANTIALIAS);
        this._engine.setHardwareScalingLevel(HW_SCALE_NORMAL);
    }


    // Detects if running on mobile device
    isMobileDevice(): boolean {
        let mobile = (navigator.userAgent||navigator.vendor).match(/(quest|android|iphone|blackberry|ipod|kindle)/i) != null;
        return mobile;
    };


    // Create a few cameras
    createCameras(): void {
        // initialize cameras array
        this._cameras = new Array<OriginCamera>();

        let camPos = this._hangarPos.add(new BABYLON.Vector3(1, 1.1, 0));
        let cam1 = new OriginCamera("cam1", camPos, this._scene);
        cam1.doubletgt = camPos.add(new BABYLON.Vector3(-100, 0, -30));
        cam1.touchAngularSensibility = 10000;
        cam1.inertia = 0;
        cam1.speed = 1;
        cam1.keysUp.push(87);    		// W
        cam1.keysDown.push(83)   		// D
        cam1.keysLeft.push(65);  		// A
        cam1.keysRight.push(68); 		// S
        cam1.keysUpward.push(69);		// E
        cam1.keysDownward.push(81);     // Q
        cam1.minZ = 0.5;
        cam1.maxZ = 50000000;
        cam1.fov = 1;
        cam1.attachControl(this._canvas, true);
        this._cameras.push(cam1);
    }


    // create a default xr experience
    createDefaultXr() : void {

        this._scene.createDefaultXRExperienceAsync(
            {
                floorMeshes: this._grounds,
                outputCanvasOptions: { canvasOptions: { framebufferScaleFactor: 1/HW_SCALE_VR } }
            }).then((xrHelper) => {
                this._xrhelper = xrHelper;
                this._xrhelper.baseExperience.onStateChangedObservable.add((state) => {
                    if (state === BABYLON.WebXRState.IN_XR) {
                        // not working yet, but we hope it will in the near future
                        this._engine.setHardwareScalingLevel(HW_SCALE_VR);

                        // force xr camera to specific position and rotation
                        // when we just entered xr mode
                        //this._scene.activeCamera.position.set(0, -66, -10);
                        //(this._scene.activeCamera as BABYLON.WebXRCamera).setTarget(new BABYLON.Vector3(0, -66, 0));
                    }
                });
            }, (error) => {
                console.log("ERROR - No XR support.");
            });
    }


    // Creates the main Scene
    // with a basic model and a default environment;
    // it will also prepare for XR where available.
    createScene(): Promise<boolean> {
        let main = this;

        return new Promise(
            function (resolve, reject) {
                // show loading ui
                // uncomment the next two lines to replace the
                // default loading ui with the custom ui
                if (USE_CUSTOM_LOADINGSCREEN) {
                    main._loadingScreen = new CustomLoadingScreen("");
                    main._engine.loadingScreen = main._loadingScreen;
                }
                main._engine.displayLoadingUI();

                // create main scene
                main._scene = new BABYLON.Scene(main._engine);
                main._scene.autoClear = true;
                main._scene.autoClearDepthAndStencil = true;
                main._scene.clearColor = new BABYLON.Color4(0.1, 0.1, 0.1, 1.0);
                main._scene.ambientColor = new BABYLON.Color3(0.3, 0.3, 0.3);

                // create cameras
                main.createCameras();

                // create vfx pipeline
                if (USE_HDR) {
                    let pipeline = new BABYLON.DefaultRenderingPipeline("vfx", true, main._scene, main._cameras);
                    pipeline.fxaaEnabled = USE_ANTIALIAS;

                    // you can also add effects to the pipeline
                    // bloom, for example:
                    pipeline.bloomEnabled = true;
                    pipeline.bloomThreshold = 0.65;
                    pipeline.bloomWeight = 0.25;
                    pipeline.bloomKernel = 128;
                    pipeline.bloomScale = 0.5;

                    pipeline.chromaticAberrationEnabled = false;
                    pipeline.glowLayerEnabled = true;

                    let tonemap = new BABYLON.TonemapPostProcess("tmap", BABYLON.TonemappingOperator.Reinhard, 3., main._cameras[0]);
                    //let ssao = new BABYLON.SSAORenderingPipeline('ssaopipeline', main._scene, 0.75);
                    //let motion = new BABYLON.MotionBlurPostProcess("mblur", main._scene, 1.0, main._cameras[0]);
                    //motion.motionStrength = 1;
                }

                // enable glow
                if (USE_GLOW) {
                    let gl = new BABYLON.GlowLayer("glow", main._scene, {
                        mainTextureFixedSize: 512,
                        blurKernelSize: 64
                    });
                    gl.intensity = 0.5;
                }

                // create some lights
                main._light1 = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(0, 1, 0), main._scene);
                main._light1.intensity = 0.3;
                main._light1.specular = BABYLON.Color3.White();

                // create shadows generator
                let sunDir = main._planetPos.clone();
                sunDir.normalize();
                main._light2 = new BABYLON.DirectionalLight("light2", sunDir, main._scene);
                if (USE_SHADOWS) {
                    main._shadowgen = new BABYLON.ShadowGenerator(1024, main._light2);
                    main._shadowgen.useBlurExponentialShadowMap = true;
                    main._shadowgen.blurKernel = 32;
                }

                // space skybox
                let skybox = BABYLON.MeshBuilder.CreateBox("skyBox", {size:2048000}, main._scene);
                let skyboxMaterial = new BABYLON.StandardMaterial("skyBox", main._scene);
                skyboxMaterial.backFaceCulling = false;
                skyboxMaterial.disableLighting = true;
                skyboxMaterial.reflectionTexture = new BABYLON.CubeTexture("./assets/tex/sky01/sky01", main._scene);
                skyboxMaterial.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
                skyboxMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0);
                skyboxMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
                skybox.material = skyboxMaterial;			

                // ==========================================

                BABYLON.SceneLoader.ImportMesh("", "assets/models/", "asteroid.glb", main._scene, async function (ast_meshes, ast_particles, ast_skeletons) {

                    BABYLON.SceneLoader.ImportMesh("", "assets/models/", "hangar.glb", main._scene, async function (hangar_meshes, hangar_particles, hangar_skeletons) {

                        // Sun is located at world's origin
                        let entSun = new Entity("entSun", main._scene);
                        main._cameras[0].add(entSun);
                        let sun = BABYLON.CreateSphere("sun", {diameter:2048});
                        sun.parent = entSun;
                        let sunMat = new BABYLON.StandardMaterial("sun", main._scene);
                        sunMat.diffuseColor = BABYLON.Color3.Yellow();
                        sunMat.emissiveColor = BABYLON.Color3.Yellow();
                        sun.material = sunMat;
                        let sunBill = BABYLON.CreatePlane("sunBill", {size:64000});
                        sunBill.parent = entSun;
                        sunBill.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
                        let sunBillMat = new BABYLON.StandardMaterial("sun", main._scene);
                        sunBillMat.disableLighting = true;
                        sunBillMat.emissiveTexture = new BABYLON.Texture("./assets/tex/star_glow1.png", main._scene);
                        sunBillMat.opacityTexture = sunBillMat.emissiveTexture;
                        sunBillMat.opacityTexture.getAlphaFromRGB = true;
                        sunBillMat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
                        sunBillMat.alphaMode = BABYLON.Engine.ALPHA_ADD;
                        sunBillMat.disableDepthWrite = true;
                        sunBill.material = sunBillMat;

                        // Create an entity for the hangar
                        let entHangar = new Entity("entHangar", main._scene);
                        main._cameras[0].add(entHangar);
                        entHangar.doublepos = main._hangarPos;
                        hangar_meshes[0].parent = entHangar;
                        // add a blinking red light
                        main._blinking = BABYLON.CreateBox("blink", {width:5, height:64, depth:10});
                        main._blinking.parent = entHangar;
                        main._blinking.position.y = -33;
                        let blinkMat = new BABYLON.StandardMaterial("sun", main._scene);
                        blinkMat.diffuseColor =  BABYLON.Color3.Black();
                        blinkMat.emissiveColor = BABYLON.Color3.Red();
                        main._blinking.material = blinkMat;


                        // Create a floating-origin Entity
                        // for a big sphere which mimics a planet;
                        // notice that we add the Entity to the OriginCamera,
                        // and make the sphere parent of this Entity
                        // for it to be updated every frame.
                        let entPlanet = new Entity("entPlanet", main._scene);
                        entPlanet.doublepos = main._planetPos;
                        main._cameras[0].add(entPlanet);
                        let sphere = BABYLON.CreateSphere("sph", {diameter:32768});
                        sphere.parent = entPlanet;
                        let sphMat = new BABYLON.StandardMaterial("sph", main._scene);
                        sphMat.diffuseTexture = new BABYLON.Texture("./assets/tex/saturn.jpg", main._scene);
                        sphMat.specularPower = .5;
                        sphMat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
                        sphMat.roughness = 0.7;
                        sphere.material = sphMat;

                        // Create other entities and
                        // many instances of a little cube
                        // to mimic an asteroid field;
                        // notice that create one Entity for different regions
                        // that are far apart, then we add some cubes to
                        // that same Entity before moving to a new one.
                        let asteroid = ast_meshes[0].getChildMeshes()[0] as BABYLON.Mesh; //BABYLON.CreateSphere("asteroid", {segments:3, diameter:2});
                        asteroid.parent = null;
                        let astMat = new BABYLON.StandardMaterial("ast", main._scene);
                        astMat.diffuseTexture = new BABYLON.Texture("./assets/tex/asteroid.jpg", main._scene);
                        (astMat.diffuseTexture as BABYLON.Texture).uScale = (astMat.diffuseTexture as BABYLON.Texture).vScale = 4;
                        astMat.specularPower = 3;
                        astMat.specularColor = new BABYLON.Color3(0.35, 0.35, 0.35);
                        astMat.roughness = 0.9;
                        asteroid.material = astMat;
                        asteroid.setEnabled(false);

                        for (let i = 0; i < 360; i += 15) {
                            // entity for one region
                            let ent = new Entity("ent" + (i+2), main._scene);

                            // calculate the angle for the region
                            let ang = i * Math.PI / 180;

                            // position the entity at that region
                            ent.doublepos.set(entPlanet.doublepos.x + 33000 * Math.sin(ang), entPlanet.doublepos.y, entPlanet.doublepos.z + 33000 * Math.cos(ang));
                            main._cameras[0].add(ent);

                            // add some cubes to that entity
                            for (let j = 0; j < 32; j++) {
                                let inst = asteroid.createInstance("inst" + j);
                                inst.parent = ent;
                                let s = 1 + Math.random() * 16;
                                inst.scaling.set(s, s, s);
                                inst.rotation = new BABYLON.Vector3(Math.random()*180, Math.random()*180, Math.random()*180);
                                inst.position.set(-6000 + Math.random() * 12000, -4000 + Math.random() * 8000, -6000 + Math.random() * 12000);
                            }
                        }

                        //main._scene.fogMode = BABYLON.Scene.FOGMODE_EXP;
                        //main._scene.fogDensity = 0.00006;
                        //main._scene.fogColor = BABYLON.Color3.Black();

                        // volumetric light
                        //let vls = new BABYLON.VolumetricLightScatteringPostProcess("vls", 1.0, main._cameras[0], sun, 8, BABYLON.Texture.BILINEAR_SAMPLINGMODE, main._engine, false);

                        // lens flares
                        //let lensFlareSystem = new BABYLON.LensFlareSystem("lensFlareSystem", sun, main._scene);
                        //let flare1 = new BABYLON.LensFlare(0.5, 0.15, new BABYLON.Color3(1, 1, 1), "assets/tex/star_glow1.png", lensFlareSystem);

                        // set logarithmic zbuffer to
                        // all materials in scene
                        main._scene.meshes.forEach(function(m)
                        {
                            if (m.material)
                            {
                                (m.material as BABYLON.StandardMaterial).useLogarithmicDepth = true;
                                console.log(m.name + " using logarithmic zbuffer");
                            }
                        });

                        // change camera speed on mousewheel
                        main._canvas.addEventListener("wheel", function(e) {
                            main._cameras[0].speed = Math.min(1000, Math.max(1, main._cameras[0].speed += e.deltaY * 0.1));
                        });

                        // look at hangar on space press
                        main._canvas.addEventListener("keydown", function(e) {
                            if (e.key === " ") main._cameras[0].doubletgt = entHangar.doublepos ;
                        });

                        // ==========================================

                        // ready to play
                        if (USE_DEBUG_LAYER) main._scene.debugLayer.show();
                        console.log("All resources loaded!");

                        // enable user click to close loading screen
                        document.getElementById("frontdiv2").innerHTML = "<h2>CLICK TO START</h2>"
                        document.getElementById("frontdiv").style.cursor = "pointer";

                        // when starting the game itself,
                        // we finally create a default xr experience
                        if (USE_CUSTOM_LOADINGSCREEN)
                        {
                            // when using a custom loading, we will wait for the user to click,
                            // so we can also automatically start the background music...
                            document.getElementById("frontdiv").addEventListener("click", async function () {
                                main.createDefaultXr();
                                resolve(true);
                            });
                        }
                        else
                        {
                            // just open the default xr env
                            main.createDefaultXr();
                            resolve(true);
                        }
                    });
                });
            });
    }


    // Game main loop
    run(): void {
        // hide the loading ui
        this._engine.hideLoadingUI();

        // get the fps div to show fps count
        this._fps = document.getElementById("fps");

        // process cameras toggle
        // ### just keyboard for now
        this._scene.onKeyboardObservable.add((kbInfo) => {
            switch (kbInfo.type) {
                case BABYLON.KeyboardEventTypes.KEYDOWN:
                    switch (kbInfo.event.keyCode) {
                        case 67:
                            {
                                this._cameras[this._curcamera].detachControl();
                                this._curcamera = (this._curcamera + 1) % this._cameras.length;
                                this._cameras[this._curcamera].attachControl(true);
                                let cam_name = "camera" + (this._curcamera + 1);
                                this._scene.setActiveCameraByName(cam_name);
                                console.log("Current camera: [" + this._curcamera + "] " + cam_name);
                                break
                            }
                    }
                    break;
                case BABYLON.KeyboardEventTypes.KEYUP:
                    break;
            }
        });

        // before rendering a new frame
        this._scene.registerBeforeRender(() => {
            let fps = this._engine.getFps();
            this._fps.innerHTML = fps.toFixed() + " fps";

            if (this._frame++ % 120 == 0) {
                this._on = !this._on;
                if (this._on)
                {
                    (this._blinking.material as BABYLON.StandardMaterial).emissiveColor = BABYLON.Color3.Red();
                }
                else
                {
                    (this._blinking.material as BABYLON.StandardMaterial).emissiveColor = BABYLON.Color3.Black();
                }
            }
        });

        // render loop
        this._engine.runRenderLoop(() => {
            this._scene.render();
        });

        // resize event handler
        window.addEventListener('resize', () => {
            this._engine.resize();
        });
    }

}