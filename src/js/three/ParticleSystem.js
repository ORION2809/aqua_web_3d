/**
 * Aurora Aqua - Particle System
 * BIOLUMINESCENT DEPTH-REACTIVE PARTICLES
 * 
 * Particles are not decoration — they are life.
 * They brighten near the camera (proximity glow).
 * They pulse with organic rhythm in deep zones.
 * They migrate upward in slow spirals like plankton.
 */

import * as THREE from 'three';
import { isMobile, getPerformanceTier } from '../utils/device.js';

export class ParticleSystem {
  constructor(options = {}) {
    const tier = getPerformanceTier();
    const baseCounts = { low: 400, medium: 1200, high: 2500 };
    
    this.count = options.count || baseCounts[tier] || 1200;
    this.size = options.size || (isMobile() ? 0.3 : 0.45);
    this.spread = options.spread || { x: 100, y: 60, z: 80 };
    this.speed = options.speed || 0.5;
    this.color1 = options.color1 || 0x22d3ee;
    this.color2 = options.color2 || 0x67e8f9;
    this.bioluminescent = options.bioluminescent !== false;
    
    this.init();
  }

  init() {
    this.geometry = new THREE.BufferGeometry();
    
    const positions = new Float32Array(this.count * 3);
    const colors = new Float32Array(this.count * 3);
    const sizes = new Float32Array(this.count);
    const randoms = new Float32Array(this.count * 4);
    
    const color1 = new THREE.Color(this.color1);
    const color2 = new THREE.Color(this.color2);
    
    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3;
      const i4 = i * 4;
      
      positions[i3] = (Math.random() - 0.5) * this.spread.x;
      positions[i3 + 1] = (Math.random() - 0.5) * this.spread.y;
      positions[i3 + 2] = (Math.random() - 0.5) * this.spread.z;
      
      const mixRatio = Math.random();
      const mixedColor = color1.clone().lerp(color2, mixRatio);
      colors[i3] = mixedColor.r;
      colors[i3 + 1] = mixedColor.g;
      colors[i3 + 2] = mixedColor.b;
      
      sizes[i] = Math.random() * this.size + 0.1;
      
      randoms[i4] = Math.random();
      randoms[i4 + 1] = Math.random();
      randoms[i4 + 2] = Math.random();
      randoms[i4 + 3] = Math.random();
    }
    
    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    this.geometry.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 4));
    
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uSpeed: { value: this.speed },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
        uCameraPos: { value: new THREE.Vector3(0, 20, 80) },
        uProximityRadius: { value: 40.0 },
        uBioluminescent: { value: this.bioluminescent ? 1.0 : 0.0 },
        uDepthZone: { value: 0.0 },
      },
      vertexShader: `
        uniform float uTime;
        uniform float uSpeed;
        uniform float uPixelRatio;
        uniform vec3 uCameraPos;
        uniform float uProximityRadius;
        uniform float uBioluminescent;
        uniform float uDepthZone;
        
        attribute float size;
        attribute vec4 aRandom;
        attribute vec3 color;
        
        varying vec3 vColor;
        varying float vOpacity;
        varying float vProximityGlow;
        
        void main() {
          vColor = color;
          
          vec3 pos = position;
          float time = uTime * uSpeed;
          
          // Vertical bobbing — plankton-like
          pos.y += sin(time * (0.5 + aRandom.x * 0.5) + aRandom.y * 6.28) * (1.0 + aRandom.z * 2.0);
          
          // Horizontal drift
          pos.x += sin(time * 0.3 + aRandom.z * 6.28) * (0.5 + aRandom.w * 1.5);
          pos.z += cos(time * 0.25 + aRandom.x * 6.28) * (0.5 + aRandom.y * 1.5);
          
          // Spiral migration (slow upward drift like real plankton)
          float spiral = time * 0.5 + aRandom.w * 6.28;
          pos.x += cos(spiral) * aRandom.x * 2.0;
          pos.z += sin(spiral) * aRandom.y * 2.0;
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          
          // ═══ BIOLUMINESCENT PROXIMITY GLOW ═══
          // Particles brighten when camera approaches — like disturbing bioluminescent life
          float distToCamera = length((modelMatrix * vec4(pos, 1.0)).xyz - uCameraPos);
          float proximity = 1.0 - smoothstep(0.0, uProximityRadius, distToCamera);
          vProximityGlow = proximity * proximity * uBioluminescent;
          
          // Size — larger when close (proximity bloom)
          float baseSize = size * uPixelRatio * (300.0 / -mvPosition.z);
          baseSize *= 1.0 + vProximityGlow * 1.5;
          gl_PointSize = clamp(baseSize, 1.0, 60.0);
          
          // Opacity — depth-based + proximity boost
          float depth = -mvPosition.z;
          vOpacity = smoothstep(100.0, 20.0, depth);
          vOpacity *= 0.3 + aRandom.x * 0.7;
          
          // In deep zones, bioluminescence pulses more intensely
          float deepPulse = sin(time * 2.0 + aRandom.z * 6.28) * 0.3 * uDepthZone;
          vOpacity += deepPulse * uBioluminescent;
          
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vOpacity;
        varying float vProximityGlow;
        
        void main() {
          vec2 center = gl_PointCoord - 0.5;
          float dist = length(center);
          
          if (dist > 0.5) discard;
          
          // Soft circular falloff with glow
          float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
          alpha = pow(alpha, 1.5);
          alpha *= vOpacity;
          
          // ═══ BIOLUMINESCENT GLOW ═══
          // Inner core brightens near camera
          float innerGlow = 1.0 - smoothstep(0.0, 0.25, dist);
          float glowIntensity = 0.5 + vProximityGlow * 2.0;
          
          vec3 color = vColor;
          color += innerGlow * glowIntensity;
          
          // Proximity adds white-cyan bloom
          color += vProximityGlow * vec3(0.3, 0.8, 1.0) * 0.5;
          
          color = clamp(color, 0.0, 1.0);
          
          // Alpha boost from proximity
          alpha = clamp(alpha + vProximityGlow * 0.3, 0.0, 1.0);
          
          gl_FragColor = vec4(color, alpha * 0.9);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
    });
    
    this.mesh = new THREE.Points(this.geometry, this.material);
  }

  update(delta, elapsed, cameraPos) {
    this.material.uniforms.uTime.value = elapsed;
    if (cameraPos && this.material.uniforms.uCameraPos) {
      this.material.uniforms.uCameraPos.value.copy(cameraPos);
    }
  }

  setDepthZone(zoneValue) {
    if (this.material.uniforms.uDepthZone) {
      this.material.uniforms.uDepthZone.value = zoneValue;
    }
  }

  getMesh() {
    return this.mesh;
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}
