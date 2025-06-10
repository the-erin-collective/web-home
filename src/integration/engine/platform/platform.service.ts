import { Injectable, ElementRef } from '@angular/core';
import {
  Engine,
  Scene,
  ArcRotateCamera,
  HemisphericLight,
  Color4,
  Vector3,
} from '@babylonjs/core';

@Injectable({ providedIn: 'root' })
export class PlatformService {
  public engine: Engine;
  public scene: Scene;
  public camera: ArcRotateCamera;
  public light: HemisphericLight;

  initializePlatform(canvas: ElementRef<HTMLCanvasElement>): Scene {
    const canvasElement = canvas.nativeElement;

    // Initialize Babylon.js engine
    this.engine = new Engine(canvasElement, true);

    // Create the scene
    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(0.7, 0.7, 0.7, 0);

    // Create the camera
    this.camera = new ArcRotateCamera(
      'camera1',
      Math.PI / 2,
      Math.PI / 4,
      100,
      new Vector3(0, 5, -10),
      this.scene
    );
    this.camera.setTarget(Vector3.Zero());
    this.camera.attachControl(canvasElement, false);

    // Create the light
    this.light = new HemisphericLight(
      'light1',
      new Vector3(0, 0.5, 0),
      this.scene
    );

    return this.scene;
  }
}