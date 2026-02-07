/**
 * Aurora Aqua - Water Surface Shader
 * Procedural water surface with animated waves - underwater feel
 */

import * as THREE from 'three';
import { isMobile, getPerformanceTier } from '../utils/device.js';

export class WaterSurface {
  constructor(options = {}) {
    this.width = options.width || 200;
    this.height = options.height || 200;
    
    const tier = getPerformanceTier();
    this.segments = tier === 'low' ? 48 : (tier === 'medium' ? 80 : 128);
    
    this.position = options.position || { x: 0, y: 30, z: -30 };
    this.mobile = isMobile();
    
    this.init();
  }

  init() {
    this.geometry = new THREE.PlaneGeometry(
      this.width,
      this.height,
      this.segments,
      this.segments
    );

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uMouse: { value: new THREE.Vector2(0.5, 0.5) },
        uColorDeep: { value: new THREE.Color(0x0a3d62) },
        uColorSurface: { value: new THREE.Color(0x0891b2) },
        uColorHighlight: { value: new THREE.Color(0x22d3ee) },
        uWaveSpeed: { value: 0.5 },
        uWaveAmplitude: { value: isMobile() ? 2.0 : 3.5 },
        uWaveFrequency: { value: 0.15 },
        uOpacity: { value: 0.9 },
      },
      vertexShader: `
        uniform float uTime;
        uniform float uWaveSpeed;
        uniform float uWaveAmplitude;
        uniform float uWaveFrequency;
        
        varying vec2 vUv;
        varying float vElevation;
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        //	Simplex 3D Noise
        vec4 permute(vec4 x){ return mod(((x*34.0)+1.0)*x, 289.0); }
        vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }
        
        float snoise(vec3 v){
          const vec2 C = vec2(1.0/6.0, 1.0/3.0);
          const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
          
          vec3 i  = floor(v + dot(v, C.yyy));
          vec3 x0 = v - i + dot(i, C.xxx);
          
          vec3 g = step(x0.yzx, x0.xyz);
          vec3 l = 1.0 - g;
          vec3 i1 = min(g.xyz, l.zxy);
          vec3 i2 = max(g.xyz, l.zxy);
          
          vec3 x1 = x0 - i1 + C.xxx;
          vec3 x2 = x0 - i2 + C.yyy;
          vec3 x3 = x0 - D.yyy;
          
          i = mod(i, 289.0);
          vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
            
          float n_ = 1.0/7.0;
          vec3 ns = n_ * D.wyz - D.xzx;
          
          vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
          
          vec4 x_ = floor(j * ns.z);
          vec4 y_ = floor(j - 7.0 * x_);
          
          vec4 x = x_ *ns.x + ns.yyyy;
          vec4 y = y_ *ns.x + ns.yyyy;
          vec4 h = 1.0 - abs(x) - abs(y);
          
          vec4 b0 = vec4(x.xy, y.xy);
          vec4 b1 = vec4(x.zw, y.zw);
          
          vec4 s0 = floor(b0)*2.0 + 1.0;
          vec4 s1 = floor(b1)*2.0 + 1.0;
          vec4 sh = -step(h, vec4(0.0));
          
          vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
          vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
          
          vec3 p0 = vec3(a0.xy, h.x);
          vec3 p1 = vec3(a0.zw, h.y);
          vec3 p2 = vec3(a1.xy, h.z);
          vec3 p3 = vec3(a1.zw, h.w);
          
          vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
          p0 *= norm.x;
          p1 *= norm.y;
          p2 *= norm.z;
          p3 *= norm.w;
          
          vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
          m = m * m;
          return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
        }
        
        void main() {
          vUv = uv;
          
          vec3 pos = position;
          
          // Multi-layer wave simulation
          float time = uTime * uWaveSpeed;
          
          float wave1 = snoise(vec3(pos.x * uWaveFrequency, pos.y * uWaveFrequency, time * 0.5)) * uWaveAmplitude;
          float wave2 = snoise(vec3(pos.x * uWaveFrequency * 2.0 + 100.0, pos.y * uWaveFrequency * 2.0, time * 0.7)) * uWaveAmplitude * 0.5;
          float wave3 = snoise(vec3(pos.x * uWaveFrequency * 4.0 + 200.0, pos.y * uWaveFrequency * 4.0, time * 0.3)) * uWaveAmplitude * 0.25;
          
          float elevation = wave1 + wave2 + wave3;
          pos.z += elevation;
          
          vElevation = elevation;
          vPosition = pos;
          
          // Calculate normal for lighting
          float epsilon = 0.1;
          float waveXNext = snoise(vec3((pos.x + epsilon) * uWaveFrequency, pos.y * uWaveFrequency, time * 0.5)) * uWaveAmplitude;
          float waveYNext = snoise(vec3(pos.x * uWaveFrequency, (pos.y + epsilon) * uWaveFrequency, time * 0.5)) * uWaveAmplitude;
          
          vec3 tangent = normalize(vec3(epsilon, 0.0, waveXNext - wave1));
          vec3 bitangent = normalize(vec3(0.0, epsilon, waveYNext - wave1));
          vNormal = normalize(cross(tangent, bitangent));
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec2 uMouse;
        uniform vec3 uColorDeep;
        uniform vec3 uColorSurface;
        uniform vec3 uColorHighlight;
        uniform float uOpacity;
        
        varying vec2 vUv;
        varying float vElevation;
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        void main() {
          // Mix colors based on elevation for depth effect
          float normalizedElevation = (vElevation + 4.0) / 8.0;
          
          vec3 color = mix(uColorDeep, uColorSurface, normalizedElevation);
          
          // Add bright highlights on wave peaks
          float highlight = smoothstep(0.55, 0.9, normalizedElevation);
          color = mix(color, uColorHighlight, highlight * 0.6);
          
          // Simple lighting - light from above
          vec3 lightDir = normalize(vec3(0.3, 1.0, 0.5));
          float diffuse = max(dot(vNormal, lightDir), 0.0);
          color += diffuse * 0.2;
          
          // Fresnel effect - edges glow
          vec3 viewDir = normalize(cameraPosition - vPosition);
          float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 2.5);
          color = mix(color, uColorHighlight, fresnel * 0.4);
          
          // Caustic-like shimmer
          float caustic = sin(vUv.x * 40.0 + uTime) * sin(vUv.y * 40.0 + uTime * 0.7) * 0.5 + 0.5;
          caustic = pow(caustic, 3.0) * 0.15;
          color += vec3(caustic) * uColorHighlight;
          
          // Subtle gradient fade at edges
          float edgeFade = 1.0 - smoothstep(0.35, 0.5, length(vUv - 0.5));
          
          gl_FragColor = vec4(color, uOpacity * (0.6 + edgeFade * 0.4));
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.position.set(this.position.x, this.position.y, this.position.z);
  }

  update(delta, elapsed) {
    this.material.uniforms.uTime.value = elapsed;
  }

  setMousePosition(x, y) {
    this.material.uniforms.uMouse.value.set(x, y);
  }

  getMesh() {
    return this.mesh;
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}
