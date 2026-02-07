/**
 * Aurora Aqua - Particle System
 * Floating particles (bubbles, plankton) with GPU optimization
 * Creates immersive underwater atmosphere
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
      
      // Random positions
      positions[i3] = (Math.random() - 0.5) * this.spread.x;
      positions[i3 + 1] = (Math.random() - 0.5) * this.spread.y;
      positions[i3 + 2] = (Math.random() - 0.5) * this.spread.z;
      
      // Random colors between color1 and color2
      const mixRatio = Math.random();
      const mixedColor = color1.clone().lerp(color2, mixRatio);
      colors[i3] = mixedColor.r;
      colors[i3 + 1] = mixedColor.g;
      colors[i3 + 2] = mixedColor.b;
      
      // Random sizes
      sizes[i] = Math.random() * this.size + 0.1;
      
      // Random values for animation variation
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
      },
      vertexShader: `
        uniform float uTime;
        uniform float uSpeed;
        uniform float uPixelRatio;
        
        attribute float size;
        attribute vec4 aRandom;
        attribute vec3 color;
        
        varying vec3 vColor;
        varying float vOpacity;
        
        void main() {
          vColor = color;
          
          vec3 pos = position;
          
          // Floating animation
          float time = uTime * uSpeed;
          
          // Vertical bobbing
          pos.y += sin(time * (0.5 + aRandom.x * 0.5) + aRandom.y * 6.28) * (1.0 + aRandom.z * 2.0);
          
          // Horizontal drift
          pos.x += sin(time * 0.3 + aRandom.z * 6.28) * (0.5 + aRandom.w * 1.5);
          pos.z += cos(time * 0.25 + aRandom.x * 6.28) * (0.5 + aRandom.y * 1.5);
          
          // Spiral motion for some particles
          float spiral = time * 0.5 + aRandom.w * 6.28;
          pos.x += cos(spiral) * aRandom.x * 2.0;
          pos.z += sin(spiral) * aRandom.y * 2.0;
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          
          // Size attenuation
          gl_PointSize = size * uPixelRatio * (300.0 / -mvPosition.z);
          gl_PointSize = clamp(gl_PointSize, 1.0, 50.0);
          
          // Opacity based on depth
          float depth = -mvPosition.z;
          vOpacity = smoothstep(100.0, 20.0, depth);
          vOpacity *= 0.3 + aRandom.x * 0.7;
          
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vOpacity;
        
        void main() {
          // Circular particle with soft glow edge
          vec2 center = gl_PointCoord - 0.5;
          float dist = length(center);
          
          if (dist > 0.5) discard;
          
          // Soft circular falloff with glow
          float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
          alpha = pow(alpha, 1.5); // Softer falloff
          alpha *= vOpacity;
          
          // Inner glow - brighter center
          float innerGlow = 1.0 - smoothstep(0.0, 0.25, dist);
          
          // Color with glow
          vec3 color = vColor;
          color += innerGlow * 0.5; // Bright center
          color = clamp(color, 0.0, 1.0);
          
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

  update(delta, elapsed) {
    this.material.uniforms.uTime.value = elapsed;
  }

  getMesh() {
    return this.mesh;
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}
