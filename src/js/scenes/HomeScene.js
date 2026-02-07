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
    
    const material = new THREE.PointsMaterial({
      color: 0x67e8f9,
      size: 1.5,
      transparent: true,
      opacity: 0, // Hidden until Phase 4
      blending: THREE.AdditiveBlending,
      depthWrite: false
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
    
    console.log('🎬 CINEMATIC SEQUENCE STARTING');
    this.isAnimating = true;
    this.startTime = this.clock.getElapsedTime();
    this.clock.start();
    
    // PHASE 0: Lock everything
    this.lockReality();
    
    // Begin the sequence
    this.animate();
    
    // Start the timeline
    this.runCinematicTimeline();
  }

  lockReality() {
    console.log('🔒 Phase 0: Reality locked');
    
    document.body.classList.add('lock-scroll', 'cinematic-mode');
    
    // Hide hero content initially for dramatic reveal
    gsap.set('.hero__content', { opacity: 0, y: 30 });
    gsap.set('.hero__tag', { opacity: 0 });
    gsap.set('.hero__title-word', { opacity: 0, y: 100 });
    gsap.set('.hero__description', { opacity: 0 });
    gsap.set('.hero__cta', { opacity: 0 });
    
    // Notify Lenis to stop (if available)
    window.dispatchEvent(new CustomEvent('lockScroll'));
  }

  runCinematicTimeline() {
    const tl = gsap.timeline();
    
    // ─────────────────────────────────────────────────────────
    // PHASE 1: ARRIVAL (0s → 2s)
    // "This is calm... too calm."
    // ─────────────────────────────────────────────────────────
    
    tl.call(() => {
      console.log('🎬 Phase 1: Arrival');
      this.phase = 'arrival';
    });
    
    // Fade in hero content gently
    tl.to('.hero__content', {
      opacity: 1,
      y: 0,
      duration: 1.5,
      ease: 'power2.out'
    }, 0.5);
    
    tl.to('.hero__tag', { opacity: 1, duration: 0.8 }, 0.8);
    tl.to('.hero__title-word', { 
      opacity: 1, 
      y: 0, 
      duration: 0.8, 
      stagger: 0.1,
      ease: 'power2.out'
    }, 1);
    
    // ─────────────────────────────────────────────────────────
    // PHASE 2: TENSION (2s → 5s)
    // "Something is wrong."
    // ─────────────────────────────────────────────────────────
    
    tl.call(() => {
      console.log('🎬 Phase 2: Tension building');
      this.phase = 'tension';
    }, [], 2);
    
    // Water tension builds
    tl.to(this.waterMaterial.uniforms.uPhase, {
      value: 1,
      duration: 3,
      ease: 'power1.in'
    }, 2);
    
    // Camera approaches water
    tl.to(this.camera.position, {
      z: 90,
      duration: 3,
      ease: 'power1.inOut'
    }, 2);
    
    // UI fades - loss of control
    tl.to('.hero__content', {
      opacity: 0.4,
      duration: 2
    }, 3);
    
    // Hide cursor
    tl.call(() => {
      document.body.classList.add('hide-cursor');
    }, [], 3);
    
    // ─────────────────────────────────────────────────────────
    // PHASE 3: THE ILLEGAL MOMENT (5s → 7s)
    // "What the hell just happened?"
    // ─────────────────────────────────────────────────────────
    
    // T = 5.0s — Lock harder
    tl.call(() => {
      console.log('🚨 Phase 3: ILLEGAL MOMENT');
      this.phase = 'illegal';
      document.body.classList.add('no-pointer');
    }, [], 5);
    
    // T = 5.1s — Camera LUNGE (aggressive)
    tl.to(this.camera.position, {
      z: 20,
      y: 30,
      duration: 0.4,
      ease: 'power4.in'
    }, 5.1);
    
    // T = 5.4s — Canvas VIOLATES DOM hierarchy
    tl.call(() => {
      console.log('💥 Canvas z-index violation!');
      const canvas = document.querySelector('.canvas-container');
      if (canvas) canvas.style.zIndex = '999';
    }, [], 5.4);
    
    // T = 5.5s — Surface RUPTURE
    tl.to(this.waterMaterial.uniforms.uRupture, {
      value: 1,
      duration: 0.5,
      ease: 'power2.in'
    }, 5.5);
    
    // T = 5.8s — Camera crosses plane (NO EASING - this must feel WRONG)
    tl.call(() => {
      this.camera.position.y = -10;
    }, [], 5.8);
    
    // T = 6.0s — UI DROWNS (sinks, doesn't fade)
    tl.to('.hero__content', {
      y: 80,
      opacity: 0,
      duration: 0.3,
      ease: 'power2.in'
    }, 6.0);
    
    // T = 6.3s — Darkness hit
    tl.call(() => {
      console.log('🌑 Darkness hit');
      // Add fog suddenly
      this.scene.fog = new THREE.FogExp2(0x021020, 0.015);
      this.renderer.toneMappingExposure = 0.6;
      
      // Underwater light activates
      this.underwaterLight.intensity = 1.5;
    }, [], 6.3);
    
    // T = 6.8s — Surface breach event
    tl.call(() => {
      console.log('🌊 SURFACE BREACH EVENT');
      this.hasBreached = true;
      window.dispatchEvent(new CustomEvent('surfaceBreach'));
      document.body.classList.add('surface-breached');
    }, [], 6.8);
    
    // ─────────────────────────────────────────────────────────
    // PHASE 4: DESCENT (7s → 11s)
    // "I'm inside it now."
    // ─────────────────────────────────────────────────────────
    
    tl.call(() => {
      console.log('🎬 Phase 4: Descent');
      this.phase = 'descent';
    }, [], 7);
    
    // Camera descends smoothly
    tl.to(this.camera.position, {
      y: -160,
      z: 60,
      duration: 4,
      ease: 'power1.out'
    }, 7);
    
    // Particles fade in
    tl.to(this.particles.material, {
      opacity: 0.6,
      duration: 2
    }, 7.5);
    
    // Light shafts appear
    this.lightShafts.forEach((shaft, i) => {
      tl.to(shaft.material, {
        opacity: 0.15,
        duration: 1.5
      }, 7.5 + i * 0.3);
    });
    
    // Depth rings fade in as camera passes
    this.depthRings.forEach((ring, i) => {
      tl.to(ring.material, {
        opacity: 0.3,
        duration: 0.5
      }, 8 + i * 0.8);
    });
    
    // ─────────────────────────────────────────────────────────
    // PHASE 5: CLAIM (11s → 15s)
    // "This site owns me."
    // ─────────────────────────────────────────────────────────
    
    tl.call(() => {
      console.log('🎬 Phase 5: Claim');
      this.phase = 'claim';
      document.body.classList.add('underwater-mode');
    }, [], 11);
    
    // Camera settles
    tl.to(this.camera.position, {
      y: -120,
      z: 50,
      duration: 3,
      ease: 'power2.out'
    }, 11);
    
    // Reset canvas z-index (but underwater mode stays)
    tl.call(() => {
      const canvas = document.querySelector('.canvas-container');
      if (canvas) canvas.style.zIndex = '1';
    }, [], 12);
    
    // New UI appears - underwater styled
    tl.call(() => {
      // Show underwater hero content
      gsap.set('.hero__content', { y: 0 });
      gsap.to('.hero__content', {
        opacity: 1,
        duration: 1.5,
        ease: 'power2.out'
      });
    }, [], 12.5);
    
    // Unlock controls
    tl.call(() => {
      console.log('🔓 Controls unlocked');
      this.phase = 'complete';
      
      document.body.classList.remove('lock-scroll', 'no-pointer', 'hide-cursor', 'cinematic-mode');
      window.dispatchEvent(new CustomEvent('unlockScroll'));
      window.dispatchEvent(new CustomEvent('cinematicComplete'));
    }, [], 14.5);
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
    
    // Phase 1: Subtle camera drift
    if (this.phase === 'arrival') {
      this.camera.position.y = 120 + Math.sin(time * 0.2) * 0.3;
    }
    
    // Phase 4+: Animate particles
    if (this.phase === 'descent' || this.phase === 'claim' || this.phase === 'complete') {
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
