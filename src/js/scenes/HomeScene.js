/**
 * Aurora Aqua - Home Scene
 * 15-SECOND CINEMATIC SEQUENCE
 * 
 * The website does not start underwater.
 * The website DROWNS.
 * 
 * This is not scrolling. This is an event.
 */

import * as THREE from 'three';
import gsap from 'gsap';
import { isMobile, getPerformanceTier } from '../utils/device.js';

export class HomeScene {
  constructor(container) {
    this.container = container;
    this.performanceTier = getPerformanceTier();
    this.isMobile = isMobile();
    
    // Timeline state
    this.startTime = 0;
    this.phase = 'waiting'; // waiting, arrival, tension, illegal, descent, claim
    this.hasBreached = false;
    this.isAnimating = false;
    this.animationId = null;
    

    
    // Scene components
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.clock = new THREE.Clock();
    
    // Water surface
    this.waterSurface = null;
    this.waterMaterial = null;
    
    // Particles (added in Phase 4)
    this.particles = null;
    this.lightShafts = [];
    this.depthRings = [];
    this.particleVelocities = [];
    
    console.log('🎬 HomeScene: Preparing cinematic sequence...');
    this.init();
  }

  init() {
    this.createRenderer();
    this.createScene();
    this.createCamera();
    this.createWaterSurface();
    this.createLighting();
    
    // Prepare but don't show particles yet
    this.prepareParticles();
    this.prepareDepthRings();
    this.prepareLightShafts();
    
    this.setupResize();
  }

  createRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isMobile,
      alpha: true,
      powerPreference: 'high-performance'
    });
    
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    
    this.container.appendChild(this.renderer.domElement);
  }

  createScene() {
    this.scene = new THREE.Scene();
    // NO fog at start - mirror-like calm
    this.scene.fog = null;
  }

  createCamera() {
    // PHASE 1 camera position - above, looking down at calm water
    this.camera = new THREE.PerspectiveCamera(
      35, // Tight FOV for cinematic feel
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    );
    this.camera.position.set(0, 120, 160);
    this.camera.lookAt(0, 0, 0);
  }

  createWaterSurface() {
    // Large, flat, mirror-like water surface
    const geometry = new THREE.PlaneGeometry(800, 800, 256, 256);
    
    this.waterMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPhase: { value: 0 }, // 0=calm, 1=tension, 2=rupture
        uRupture: { value: 0 },
        uColorDeep: { value: new THREE.Color(0x041e42) },
        uColorSurface: { value: new THREE.Color(0x0a4a6e) },
        uColorHighlight: { value: new THREE.Color(0x67e8f9) }
      },
      vertexShader: `
        uniform float uTime;
        uniform float uPhase;
        uniform float uRupture;
        
        varying vec2 vUv;
        varying float vElevation;
        varying vec3 vWorldPos;
        
        void main() {
          vUv = uv;
          vec3 pos = position;
          
          // Phase 0-1: Almost completely flat, mirror-like
          float calmWave = sin(pos.x * 0.01 + uTime * 0.3) * 0.5;
          calmWave += sin(pos.y * 0.01 + uTime * 0.2) * 0.3;
          
          // Phase 2: Tension builds - ripples increase
          float tensionWave = sin(pos.x * 0.05 + uTime * 1.5) * 2.0 * uPhase;
          tensionWave += sin(pos.y * 0.04 + uTime * 1.2) * 1.5 * uPhase;
          
          pos.z = mix(calmWave, tensionWave, uPhase);
          
          // RUPTURE: Water collapses downward
          pos.z -= uRupture * 25.0;
          
          vElevation = pos.z;
          vWorldPos = (modelMatrix * vec4(pos, 1.0)).xyz;
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uPhase;
        uniform vec3 uColorDeep;
        uniform vec3 uColorSurface;
        uniform vec3 uColorHighlight;
        
        varying vec2 vUv;
        varying float vElevation;
        varying vec3 vWorldPos;
        
        void main() {
          // Base color gradient
          float distFromCenter = length(vUv - 0.5);
          vec3 color = mix(uColorSurface, uColorDeep, distFromCenter * 1.5);
          
          // Reflection highlights
          float highlight = smoothstep(-0.5, 2.0, vElevation);
          color = mix(color, uColorHighlight, highlight * 0.15);
          
          // Tension: UV warp distortion
          vec2 distortedUv = vUv;
          distortedUv.y += sin(vUv.x * 12.0 + uTime * 2.0) * 0.03 * uPhase;
          
          // Fresnel-like edge glow
          float fresnel = pow(1.0 - abs(dot(normalize(vWorldPos), vec3(0.0, 1.0, 0.0))), 3.0);
          color += uColorHighlight * fresnel * 0.1;
          
          // Light pulse off-rhythm during tension
          float pulse = sin(uTime * 3.7) * 0.5 + 0.5;
          color *= 1.0 + pulse * 0.1 * uPhase;
          
          gl_FragColor = vec4(color, 0.95);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide
    });
    
    this.waterSurface = new THREE.Mesh(geometry, this.waterMaterial);
    this.waterSurface.rotation.x = -Math.PI / 2;
    this.waterSurface.position.y = 0;
    this.scene.add(this.waterSurface);
  }

  createLighting() {
    // Minimal, clean lighting for calm phase
    const ambient = new THREE.AmbientLight(0x0a4a6e, 0.4);
    this.scene.add(ambient);
    
    // Main directional - sun-like
    this.mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
    this.mainLight.position.set(50, 100, 50);
    this.scene.add(this.mainLight);
    
    // Underwater light (hidden until breach)
    this.underwaterLight = new THREE.PointLight(0x22d3ee, 0, 200);
    this.underwaterLight.position.set(0, -50, 0);
    this.scene.add(this.underwaterLight);
  }

  prepareParticles() {
    // Particles are hidden until Phase 4
    const count = this.performanceTier === 'high' ? 2000 : 
                  this.performanceTier === 'medium' ? 1000 : 500;
    
    const positions = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 200;
      positions[i * 3 + 1] = -Math.random() * 300 - 50; // Below water
      positions[i * 3 + 2] = (Math.random() - 0.5) * 200;
      
      this.particleVelocities.push({
        y: 0.1 + Math.random() * 0.2, // Slow upward drift
        phase: Math.random() * Math.PI * 2
      });
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    // Generate a round bubble texture
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const center = 32;
    const radius = 28;
    
    // Soft radial gradient — bright center fading to transparent edge
    const gradient = ctx.createRadialGradient(center, center, 0, center, center, radius);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.3, 'rgba(103, 232, 249, 0.8)');
    gradient.addColorStop(0.7, 'rgba(103, 232, 249, 0.3)');
    gradient.addColorStop(1, 'rgba(103, 232, 249, 0)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.fill();
    
    const bubbleTexture = new THREE.CanvasTexture(canvas);
    
    const material = new THREE.PointsMaterial({
      color: 0x67e8f9,
      size: 3,
      map: bubbleTexture,
      transparent: true,
      opacity: 0, // Hidden until descent
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });
    
    this.particles = new THREE.Points(geometry, material);
    this.scene.add(this.particles);
  }

  prepareLightShafts() {
    // Volumetric light shafts - hidden until Phase 4
    for (let i = 0; i < 5; i++) {
      const geometry = new THREE.CylinderGeometry(2, 8, 200, 8, 1, true);
      const material = new THREE.MeshBasicMaterial({
        color: 0x22d3ee,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      
      const shaft = new THREE.Mesh(geometry, material);
      shaft.position.set(
        (Math.random() - 0.5) * 100,
        50,
        (Math.random() - 0.5) * 100 - 50
      );
      shaft.rotation.x = Math.PI;
      
      this.lightShafts.push(shaft);
      this.scene.add(shaft);
    }
  }

  prepareDepthRings() {
    // Depth marker rings - hidden until Phase 4
    for (let i = 0; i < 4; i++) {
      const geometry = new THREE.RingGeometry(30, 32, 64);
      const material = new THREE.MeshBasicMaterial({
        color: 0x0891b2,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide
      });
      
      const ring = new THREE.Mesh(geometry, material);
      ring.position.y = -50 - i * 40;
      ring.rotation.x = Math.PI / 2;
      
      this.depthRings.push(ring);
      this.scene.add(ring);
    }
  }

  setupResize() {
    this.resizeHandler = () => {
      if (!this.camera || !this.renderer) return;
      
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    };
    
    window.addEventListener('resize', this.resizeHandler);
  }

  // ═══════════════════════════════════════════════════════════
  // THE CINEMATIC SEQUENCE
  // ═══════════════════════════════════════════════════════════

  start() {
    if (this.isAnimating) return;
    
    console.log('🌊 Starting underwater scene');
    this.isAnimating = true;
    this.clock.start();
    this.startTime = this.clock.getElapsedTime();
    
    // Set up underwater environment instantly
    this.setupUnderwaterEnvironment();
    
    // Begin render loop
    this.animate();
    
    // Run the intro: camera sinks, particles appear, hero text emerges
    this.runUnderwaterIntro();
  }

  setupUnderwaterEnvironment() {
    // Camera starts just below the surface
    this.camera.position.set(0, -10, 60);
    this.camera.lookAt(0, -40, 0);
    
    // Underwater fog and lighting
    this.scene.fog = new THREE.FogExp2(0x021020, 0.015);
    this.renderer.toneMappingExposure = 0.6;
    this.underwaterLight.intensity = 1.5;
    
    // Collapse water surface (already breached)
    if (this.waterMaterial) {
      this.waterMaterial.uniforms.uRupture.value = 1;
    }
    
    this.hasBreached = true;
    this.phase = 'descent';
    
    // Body classes
    document.body.classList.add('surface-breached', 'underwater-mode');
    
    // Hide hero elements for the animated reveal
    gsap.set('.hero__tag-text', { opacity: 0, y: 20 });
    gsap.set('.hero__title-word', { opacity: 0, y: 60 });
    gsap.set('.hero__description', { opacity: 0, y: 20 });
    gsap.set('.hero__cta', { opacity: 0, y: 20 });
  }

  runUnderwaterIntro() {
    const tl = gsap.timeline();
    
    // ─────────────────────────────────────────────────────────
    // Camera sinks deeper (0s → 4s)
    // ─────────────────────────────────────────────────────────
    
    tl.to(this.camera.position, {
      y: -160,
      z: 55,
      duration: 4,
      ease: 'power1.out'
    }, 0);
    
    // Particles fade in
    tl.to(this.particles.material, {
      opacity: 0.6,
      duration: 2.5
    }, 0.5);
    
    // Light shafts appear staggered
    this.lightShafts.forEach((shaft, i) => {
      tl.to(shaft.material, {
        opacity: 0.15,
        duration: 1.5
      }, 0.5 + i * 0.3);
    });
    
    // Depth rings fade in as camera passes
    this.depthRings.forEach((ring, i) => {
      tl.to(ring.material, {
        opacity: 0.3,
        duration: 0.5
      }, 1 + i * 0.8);
    });
    
    // ─────────────────────────────────────────────────────────
    // Camera settles + hero text emerges (3s → 6s)
    // ─────────────────────────────────────────────────────────
    
    // Camera eases to final resting position
    tl.to(this.camera.position, {
      y: -120,
      z: 50,
      duration: 2.5,
      ease: 'power2.out'
    }, 3.5);
    
    // Tag text fades in
    tl.to('.hero__tag-text', {
      opacity: 1,
      y: 0,
      duration: 0.8,
      ease: 'power2.out'
    }, 3);
    
    // Title words stagger in
    tl.to('.hero__title-word', {
      opacity: 1,
      y: 0,
      duration: 0.8,
      stagger: 0.1,
      ease: 'power2.out'
    }, 3.5);
    
    // Description
    tl.to('.hero__description', {
      opacity: 1,
      y: 0,
      duration: 0.8,
      ease: 'power2.out'
    }, 4);
    
    // CTA buttons
    tl.to('.hero__cta', {
      opacity: 1,
      y: 0,
      duration: 0.8,
      ease: 'power2.out'
    }, 4.3);
    
    // ─────────────────────────────────────────────────────────
    // Done — unlock scroll (6s)
    // ─────────────────────────────────────────────────────────
    
    tl.call(() => {
      console.log('🌊 Underwater intro complete');
      this.phase = 'complete';
      
      window.dispatchEvent(new CustomEvent('surfaceBreach'));
      window.dispatchEvent(new CustomEvent('cinematicComplete'));
    }, [], 6);
  }

  animate() {
    if (!this.isAnimating) return;
    
    this.animationId = requestAnimationFrame(() => this.animate());
    
    const elapsed = this.clock.getElapsedTime();
    const time = elapsed - this.startTime;
    
    // Update water shader
    if (this.waterMaterial) {
      this.waterMaterial.uniforms.uTime.value = time;
    }
    
    // Animate particles and light shafts
    if (this.phase === 'descent' || this.phase === 'complete') {
      this.updateParticles(time);
      this.updateLightShafts(time);
    }
    
    this.renderer.render(this.scene, this.camera);
  }

  updateParticles(time) {
    if (!this.particles) return;
    
    const positions = this.particles.geometry.attributes.position.array;
    
    for (let i = 0; i < positions.length / 3; i++) {
      const vel = this.particleVelocities[i];
      if (!vel) continue;
      
      // Slow upward drift
      positions[i * 3 + 1] += vel.y;
      
      // Gentle horizontal sway
      positions[i * 3] += Math.sin(time + vel.phase) * 0.02;
      positions[i * 3 + 2] += Math.cos(time * 0.7 + vel.phase) * 0.02;
      
      // Reset at top
      if (positions[i * 3 + 1] > 0) {
        positions[i * 3 + 1] = -300;
      }
    }
    
    this.particles.geometry.attributes.position.needsUpdate = true;
  }

  updateLightShafts(time) {
    this.lightShafts.forEach((shaft, i) => {
      shaft.material.opacity = 0.1 + Math.sin(time * 0.5 + i) * 0.05;
      shaft.rotation.y = time * 0.05;
    });
  }

  // Scroll handler (after cinematic completes)
  onScroll(scrollY, scrollLimit) {
    if (this.phase !== 'complete') return;
    
    const progress = scrollY / scrollLimit;
    
    // Camera moves deeper with scroll
    this.camera.position.y = -120 - progress * 80;
    this.camera.position.z = 50 - progress * 20;
  }

  stop() {
    this.isAnimating = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  destroy() {
    this.stop();
    
    window.removeEventListener('resize', this.resizeHandler);
    
    // Cleanup
    if (this.scene) {
      this.scene.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach(m => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
    }
    
    if (this.renderer) {
      this.renderer.dispose();
      
      if (this.renderer.domElement && this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
    }
    
    // Remove classes
    document.body.classList.remove(
      'lock-scroll', 'cinematic-mode', 'no-pointer', 
      'hide-cursor', 'surface-breached', 'underwater-mode'
    );
  }

  dispose() {
    this.destroy();
  }
}
