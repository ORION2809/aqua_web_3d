/**
 * Aurora Aqua - Lighting Setup
 * Ambient and directional lighting for underwater feel
 */

import * as THREE from 'three';

export class LightingSetup {
  constructor(scene) {
    this.scene = scene;
    this.lights = [];
    
    this.init();
  }

  init() {
    // Ambient light - bright underwater glow
    this.ambientLight = new THREE.AmbientLight(0x0891b2, 0.5);
    this.lights.push(this.ambientLight);
    this.scene.add(this.ambientLight);
    
    // Main directional light - simulates light from surface
    this.mainLight = new THREE.DirectionalLight(0x67e8f9, 0.8);
    this.mainLight.position.set(10, 50, 30);
    this.mainLight.castShadow = false; // Disable for performance
    this.lights.push(this.mainLight);
    this.scene.add(this.mainLight);
    
    // Fill light - adds depth
    this.fillLight = new THREE.DirectionalLight(0x22d3ee, 0.4);
    this.fillLight.position.set(-20, -10, -20);
    this.lights.push(this.fillLight);
    this.scene.add(this.fillLight);
    
    // Rim light - edge highlighting
    this.rimLight = new THREE.DirectionalLight(0xa5f3fc, 0.3);
    this.rimLight.position.set(0, 0, -50);
    this.lights.push(this.rimLight);
    this.scene.add(this.rimLight);
    
    // Point lights for glow effects - brighter
    this.glowLight1 = new THREE.PointLight(0x22d3ee, 1.0, 80);
    this.glowLight1.position.set(20, 10, 20);
    this.lights.push(this.glowLight1);
    this.scene.add(this.glowLight1);
    
    this.glowLight2 = new THREE.PointLight(0x0891b2, 0.7, 60);
    this.glowLight2.position.set(-20, -10, -20);
    this.lights.push(this.glowLight2);
    this.scene.add(this.glowLight2);
    
    // Additional caustic-like point light
    this.glowLight3 = new THREE.PointLight(0x67e8f9, 0.5, 70);
    this.glowLight3.position.set(0, 30, 0);
    this.lights.push(this.glowLight3);
    this.scene.add(this.glowLight3);
  }

  update(elapsed) {
    // Subtle light animation for underwater feel
    const intensity = 0.5 + Math.sin(elapsed * 0.5) * 0.1;
    this.mainLight.intensity = intensity;
    
    // Move glow lights slightly
    this.glowLight1.position.x = 20 + Math.sin(elapsed * 0.3) * 5;
    this.glowLight1.position.y = 10 + Math.cos(elapsed * 0.4) * 3;
    
    this.glowLight2.position.x = -20 + Math.cos(elapsed * 0.25) * 4;
    this.glowLight2.position.z = -20 + Math.sin(elapsed * 0.35) * 4;
  }

  dispose() {
    this.lights.forEach(light => {
      this.scene.remove(light);
    });
    this.lights = [];
  }
}
