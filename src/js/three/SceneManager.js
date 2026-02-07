/**
 * Aurora Aqua - Three.js Scene Manager
 * Core scene management - backbone of all 3D rendering
 * Handles renderer, camera, scene, animation loop, and cleanup
 */

import * as THREE from 'three';
import { isMobile, getDevicePixelRatio, getPerformanceTier } from '../utils/device.js';

export class SceneManager {
  constructor(container) {
    if (!container) {
      console.error('SceneManager: No container provided!');
      return;
    }
    
    this.container = container;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.animationId = null;
    this.isRunning = false;
    this.isDisposed = false;
    this.clock = new THREE.Clock();
    this.objects = [];
    this.updateCallbacks = [];
    this.performanceTier = getPerformanceTier();
    
    console.log('🎬 SceneManager: Initializing...', { performanceTier: this.performanceTier });
    
    this.init();
  }

  init() {
    try {
      this.createScene();
      this.createCamera();
      this.createRenderer();
      this.setupResizeHandler();
      console.log('✅ SceneManager: Initialized successfully');
    } catch (error) {
      console.error('❌ SceneManager: Initialization failed', error);
    }
  }

  createScene() {
    this.scene = new THREE.Scene();
    
    // Transparent background to show CSS gradient beneath
    this.scene.background = null;
    
    // Underwater fog for depth effect
    const fogDensity = isMobile() ? 0.002 : 0.0025;
    this.scene.fog = new THREE.FogExp2(0x041e42, fogDensity);
  }

  createCamera() {
    const fov = isMobile() ? 70 : 60;
    this.camera = new THREE.PerspectiveCamera(
      fov,
      this.width / this.height,
      0.1,
      1000
    );
    this.camera.position.set(0, 0, 50);
    this.camera.lookAt(0, 0, 0);
  }

  createRenderer() {
    const mobile = isMobile();
    
    this.renderer = new THREE.WebGLRenderer({
      antialias: !mobile,
      alpha: true,
      powerPreference: mobile ? 'low-power' : 'high-performance',
      stencil: false,
      depth: true,
    });

    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(getDevicePixelRatio());
    
    // Color management
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    
    // Style canvas
    this.renderer.domElement.style.position = 'absolute';
    this.renderer.domElement.style.top = '0';
    this.renderer.domElement.style.left = '0';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    
    this.container.appendChild(this.renderer.domElement);
  }

  setupResizeHandler() {
    this.resizeHandler = this.handleResize.bind(this);
    window.addEventListener('resize', this.resizeHandler, { passive: true });
  }

  handleResize() {
    if (this.isDisposed) return;
    
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(getDevicePixelRatio());
  }

  addObject(object) {
    if (!object) return;
    
    this.objects.push(object);
    
    const mesh = object.mesh || object.getMesh?.() || object;
    if (mesh && mesh.isObject3D) {
      this.scene.add(mesh);
    }
  }

  removeObject(object) {
    const index = this.objects.indexOf(object);
    if (index > -1) {
      this.objects.splice(index, 1);
      const mesh = object.mesh || object.getMesh?.() || object;
      if (mesh && mesh.isObject3D) {
        this.scene.remove(mesh);
      }
    }
  }

  onUpdate(callback) {
    if (typeof callback !== 'function') return () => {};
    
    this.updateCallbacks.push(callback);
    
    return () => {
      const index = this.updateCallbacks.indexOf(callback);
      if (index > -1) {
        this.updateCallbacks.splice(index, 1);
      }
    };
  }

  start() {
    if (this.isRunning || this.isDisposed) return;
    
    console.log('▶️ SceneManager: Starting render loop');
    this.isRunning = true;
    this.clock.start();
    this.animate();
  }

  stop() {
    console.log('⏸️ SceneManager: Stopping render loop');
    this.isRunning = false;
    
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  animate() {
    if (!this.isRunning || this.isDisposed) return;

    this.animationId = requestAnimationFrame(this.animate.bind(this));

    const delta = Math.min(this.clock.getDelta(), 0.1);
    const elapsed = this.clock.getElapsedTime();

    // Update objects
    for (let i = 0; i < this.objects.length; i++) {
      const object = this.objects[i];
      if (object && typeof object.update === 'function') {
        try {
          object.update(delta, elapsed);
        } catch (e) {
          console.warn('Object update error:', e);
        }
      }
    }

    // Run callbacks
    for (let i = 0; i < this.updateCallbacks.length; i++) {
      try {
        this.updateCallbacks[i](delta, elapsed);
      } catch (e) {
        console.warn('Update callback error:', e);
      }
    }

    // Allow external render override (e.g. PostProcessing pipeline)
    if (this.renderOverride) {
      this.renderOverride(delta, elapsed);
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  setRenderOverride(fn) {
    this.renderOverride = fn;
  }

  clearRenderOverride() {
    this.renderOverride = null;
  }

  dispose() {
    if (this.isDisposed) return;
    
    console.log('🧹 SceneManager: Disposing resources...');
    this.isDisposed = true;
    
    this.stop();
    window.removeEventListener('resize', this.resizeHandler);

    // Dispose registered objects
    for (let i = 0; i < this.objects.length; i++) {
      const object = this.objects[i];
      if (object && typeof object.dispose === 'function') {
        try {
          object.dispose();
        } catch (e) {
          console.warn('Object disposal error:', e);
        }
      }
    }

    // Traverse scene
    this.scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(m => this.disposeMaterial(m));
          } else {
            this.disposeMaterial(child.material);
          }
        }
      }
    });

    // Dispose renderer
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.forceContextLoss();
      
      if (this.renderer.domElement && this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
    }

    this.objects = [];
    this.updateCallbacks = [];
    
    console.log('✅ SceneManager: Disposed successfully');
  }

  disposeMaterial(material) {
    if (!material) return;
    
    ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'envMap'].forEach(prop => {
      if (material[prop]) material[prop].dispose();
    });
    
    material.dispose();
  }

  setCameraPosition(x, y, z) {
    this.camera.position.set(x, y, z);
  }

  getCameraPosition() {
    return this.camera.position.clone();
  }

  lookAt(x, y, z) {
    this.camera.lookAt(x, y, z);
  }

  getScene() {
    return this.scene;
  }

  getCamera() {
    return this.camera;
  }

  getRenderer() {
    return this.renderer;
  }

  getPerformanceTier() {
    return this.performanceTier;
  }
}
