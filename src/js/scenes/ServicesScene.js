/**
 * Aurora Aqua - Services Page Scene
 * CENTRAL OBJECT AS VISUAL ANCHOR
 * 
 * One dominant morphing structure commands the space.
 * Camera orbits dramatically, object reacts to scroll and section.
 * Procedural geometry only - no heavy models.
 */

import { SceneManager } from '../three/SceneManager.js';
import { ParticleSystem } from '../three/ParticleSystem.js';
import { LightingSetup } from '../three/LightingSetup.js';
import { isMobile, getPerformanceTier } from '../utils/device.js';
import * as THREE from 'three';
import gsap from 'gsap';

export class ServicesScene {
  constructor(container) {
    this.container = container;
    this.sceneManager = null;
    this.particles = [];
    this.lighting = null;
    this.scrollProgress = 0;
    this.activeSection = 0;
    this.performanceTier = getPerformanceTier();
    this.isMobile = isMobile();
    
    // Central dominant object
    this.centralObject = null;
    this.centralGroup = null;
    
    // Orbiting elements
    this.orbitals = [];
    
    // Service geometries (morph targets)
    this.serviceGeometries = [];
    this.currentGeometryIndex = 0;
    
    console.log('⚙️ ServicesScene: Creating ANCHOR experience...', { tier: this.performanceTier });
    this.init();
  }

  init() {
    this.sceneManager = new SceneManager(this.container);
    const scene = this.sceneManager.getScene();
    
    // Lighter fog for focus
    scene.fog = new THREE.FogExp2(0x041e42, 0.003);
    
    // Lighting
    this.lighting = new LightingSetup(scene);
    this.setupDramaticLighting();
    
    // === CENTRAL DOMINANT OBJECT ===
    this.createCentralObject();
    
    // === ORBITAL ELEMENTS ===
    this.createOrbitals();
    
    // === ENVIRONMENT ===
    this.createEnvironment();
    
    // === PARTICLES ===
    this.createParticles();
    
    // Camera
    this.setupCamera();
    
    // Mouse
    this.setupMouseHandler();
    
    // Section observer
    this.setupSectionObserver();
    
    // Update
    this.sceneManager.onUpdate((delta, elapsed) => {
      this.update(delta, elapsed);
    });
    
    console.log('✅ ServicesScene: ANCHOR ready');
  }

  setupDramaticLighting() {
    const scene = this.sceneManager.getScene();
    
    // Key light - dramatic angle
    this.keyLight = new THREE.SpotLight(0x67e8f9, 3, 200, Math.PI / 4, 0.5, 1);
    this.keyLight.position.set(50, 80, 50);
    this.keyLight.target.position.set(0, 0, 0);
    scene.add(this.keyLight);
    scene.add(this.keyLight.target);
    
    // Fill light - opposite side
    this.fillLight = new THREE.PointLight(0x0891b2, 1.5, 150);
    this.fillLight.position.set(-60, -20, -40);
    scene.add(this.fillLight);
    
    // Rim light - behind
    this.rimLight = new THREE.PointLight(0x22d3ee, 2, 100);
    this.rimLight.position.set(0, 30, -60);
    scene.add(this.rimLight);
    
    // Ground glow
    this.groundGlow = new THREE.PointLight(0x0891b2, 1, 100);
    this.groundGlow.position.set(0, -50, 0);
    scene.add(this.groundGlow);
  }

  createCentralObject() {
    const scene = this.sceneManager.getScene();
    
    this.centralGroup = new THREE.Group();
    
    // Main geometry - starts as abstract aquaculture tank
    const mainGeo = new THREE.TorusKnotGeometry(20, 6, 128, 32);
    const mainMat = new THREE.MeshPhysicalMaterial({
      color: 0x0891b2,
      emissive: 0x041e42,
      emissiveIntensity: 0.3,
      metalness: 0.8,
      roughness: 0.15,
      transparent: true,
      opacity: 0.9,
      envMapIntensity: 1.5
    });
    
    this.centralObject = new THREE.Mesh(mainGeo, mainMat);
    this.centralGroup.add(this.centralObject);
    
    // Inner core - glowing
    const coreGeo = new THREE.IcosahedronGeometry(8, 2);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.7
    });
    this.innerCore = new THREE.Mesh(coreGeo, coreMat);
    this.centralGroup.add(this.innerCore);
    
    // Outer shell - wireframe
    const shellGeo = new THREE.IcosahedronGeometry(30, 1);
    const shellMat = new THREE.MeshBasicMaterial({
      color: 0x67e8f9,
      transparent: true,
      opacity: 0.15,
      wireframe: true
    });
    this.outerShell = new THREE.Mesh(shellGeo, shellMat);
    this.centralGroup.add(this.outerShell);
    
    // Scale up for dominance
    this.centralGroup.scale.setScalar(0);
    scene.add(this.centralGroup);
    
    // Pre-create service geometries for morphing
    this.createServiceGeometries();
  }

  createServiceGeometries() {
    // Different geometries for different services
    this.serviceGeometries = [
      new THREE.TorusKnotGeometry(20, 6, 128, 32), // Consultation
      new THREE.OctahedronGeometry(25, 2),          // Hatchery
      new THREE.TorusGeometry(18, 8, 32, 64),       // Aquafeed
      new THREE.IcosahedronGeometry(22, 2),         // Technology
      new THREE.DodecahedronGeometry(22, 1),        // Sustainability
    ];
  }

  createOrbitals() {
    const scene = this.sceneManager.getScene();
    
    // Orbiting service indicators
    const orbitalCount = this.isMobile ? 3 : 6;
    const orbitalGeo = new THREE.OctahedronGeometry(3, 0);
    const orbitalMat = new THREE.MeshPhysicalMaterial({
      color: 0x22d3ee,
      emissive: 0x0891b2,
      emissiveIntensity: 0.5,
      metalness: 0.6,
      roughness: 0.3
    });
    
    for (let i = 0; i < orbitalCount; i++) {
      const orbital = new THREE.Mesh(orbitalGeo, orbitalMat.clone());
      const angle = (i / orbitalCount) * Math.PI * 2;
      const radius = 50 + (i % 2) * 15;
      const height = (i % 3 - 1) * 20;
      
      orbital.userData = {
        angle,
        radius,
        height,
        speed: 0.3 + (i % 3) * 0.1,
        phase: i * 0.5
      };
      
      orbital.position.set(
        Math.cos(angle) * radius,
        height,
        Math.sin(angle) * radius
      );
      
      this.orbitals.push(orbital);
      scene.add(orbital);
    }
    
    // Connecting rings
    if (!this.isMobile) {
      const ringGeo = new THREE.TorusGeometry(55, 0.3, 8, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x0891b2,
        transparent: true,
        opacity: 0.2
      });
      
      for (let i = 0; i < 3; i++) {
        const ring = new THREE.Mesh(ringGeo, ringMat.clone());
        ring.rotation.x = Math.PI / 2 + i * 0.3;
        ring.position.y = (i - 1) * 15;
        scene.add(ring);
        this.orbitals.push(ring);
      }
    }
  }

  createEnvironment() {
    const scene = this.sceneManager.getScene();
    
    // Ground plane with glow
    const groundGeo = new THREE.CircleGeometry(100, 64);
    const groundMat = new THREE.MeshBasicMaterial({
      color: 0x0891b2,
      transparent: true,
      opacity: 0.05,
      side: THREE.DoubleSide
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -50;
    scene.add(ground);
    
    // Vertical beams
    if (!this.isMobile) {
      const beamGeo = new THREE.CylinderGeometry(0.5, 0.5, 150, 8);
      const beamMat = new THREE.MeshBasicMaterial({
        color: 0x22d3ee,
        transparent: true,
        opacity: 0.08
      });
      
      const positions = [
        { x: -70, z: -50 },
        { x: 70, z: -40 },
        { x: -50, z: 60 },
        { x: 60, z: 50 },
      ];
      
      positions.forEach(pos => {
        const beam = new THREE.Mesh(beamGeo, beamMat.clone());
        beam.position.set(pos.x, 0, pos.z);
        scene.add(beam);
      });
    }
  }

  createParticles() {
    const particles = new ParticleSystem({
      size: this.isMobile ? 0.2 : 0.35,
      spread: { x: 120, y: 80, z: 120 },
      speed: 0.25,
      color1: 0x22d3ee,
      color2: 0x67e8f9
    });
    this.particles.push(particles);
    this.sceneManager.addObject(particles);
  }

  setupCamera() {
    const camera = this.sceneManager.getCamera();
    
    this.cameraState = {
      orbitRadius: 100,
      orbitHeight: 30,
      orbitAngle: 0,
      targetRadius: 100,
      targetHeight: 30
    };
    
    camera.position.set(100, 30, 0);
    camera.lookAt(0, 0, 0);
  }

  setupMouseHandler() {
    if (this.isMobile) return;
    
    this.mousePosition = { x: 0.5, y: 0.5 };
    
    this.mouseMoveHandler = (e) => {
      this.mousePosition.x = e.clientX / window.innerWidth;
      this.mousePosition.y = e.clientY / window.innerHeight;
    };
    
    window.addEventListener('mousemove', this.mouseMoveHandler);
  }

  setupSectionObserver() {
    // Watch for service sections to trigger morph
    const sections = document.querySelectorAll('[data-service-section]');
    
    if (sections.length === 0) return;
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const index = parseInt(entry.target.dataset.serviceSection) || 0;
          this.morphToService(index);
        }
      });
    }, { threshold: 0.5 });
    
    sections.forEach(section => observer.observe(section));
    this.sectionObserver = observer;
  }

  morphToService(index) {
    if (index === this.currentGeometryIndex) return;
    if (index >= this.serviceGeometries.length) return;
    
    console.log(`🔄 Morphing to service ${index}`);
    this.currentGeometryIndex = index;
    
    // Dramatic morph animation
    gsap.to(this.centralObject.scale, {
      x: 0.7,
      y: 0.7,
      z: 0.7,
      duration: 0.3,
      ease: 'power2.in',
      onComplete: () => {
        // Swap geometry
        this.centralObject.geometry.dispose();
        this.centralObject.geometry = this.serviceGeometries[index].clone();
        
        // Burst back
        gsap.to(this.centralObject.scale, {
          x: 1,
          y: 1,
          z: 1,
          duration: 0.6,
          ease: 'elastic.out(1, 0.4)'
        });
        
        // Color shift
        const colors = [0x0891b2, 0x06b6d4, 0x22d3ee, 0x14b8a6, 0x0d9488];
        gsap.to(this.centralObject.material.color, {
          r: new THREE.Color(colors[index]).r,
          g: new THREE.Color(colors[index]).g,
          b: new THREE.Color(colors[index]).b,
          duration: 0.5
        });
      }
    });
    
    // Orbital burst
    this.orbitals.forEach((orbital, i) => {
      if (orbital.userData.radius) {
        gsap.to(orbital.userData, {
          radius: 40 + Math.random() * 30,
          duration: 0.5,
          ease: 'power2.out'
        });
      }
    });
    
    window.dispatchEvent(new CustomEvent('serviceChange', { detail: { index } }));
  }

  update(delta, elapsed) {
    this.lighting.update(elapsed);
    this.updateCamera(elapsed);
    this.updateCentralObject(elapsed);
    this.updateOrbitals(elapsed);
    this.updateLighting(elapsed);
  }

  updateCamera(elapsed) {
    const camera = this.sceneManager.getCamera();
    const state = this.cameraState;
    const progress = this.scrollProgress;
    
    // Orbit around the central object
    state.orbitAngle = elapsed * 0.15 + progress * Math.PI * 2;
    
    // Height and distance vary with scroll
    state.targetRadius = 90 - progress * 30;
    state.targetHeight = 30 + Math.sin(progress * Math.PI) * 25;
    
    state.orbitRadius += (state.targetRadius - state.orbitRadius) * 0.03;
    state.orbitHeight += (state.targetHeight - state.orbitHeight) * 0.03;
    
    // Mouse influence
    const mouseOffsetX = this.mousePosition ? (this.mousePosition.x - 0.5) * 20 : 0;
    const mouseOffsetY = this.mousePosition ? (this.mousePosition.y - 0.5) * 10 : 0;
    
    const targetX = Math.cos(state.orbitAngle) * state.orbitRadius;
    const targetZ = Math.sin(state.orbitAngle) * state.orbitRadius;
    const targetY = state.orbitHeight + mouseOffsetY;
    
    camera.position.x += (targetX + mouseOffsetX - camera.position.x) * 0.03;
    camera.position.y += (targetY - camera.position.y) * 0.03;
    camera.position.z += (targetZ - camera.position.z) * 0.03;
    
    camera.lookAt(0, 0, 0);
    
    // Slight roll for dynamism
    camera.rotation.z = Math.sin(elapsed * 0.3) * 0.02;
  }

  updateCentralObject(elapsed) {
    if (!this.centralGroup) return;
    
    // Main rotation
    this.centralGroup.rotation.y = elapsed * 0.2;
    this.centralGroup.rotation.x = Math.sin(elapsed * 0.15) * 0.1;
    
    // Inner core faster rotation
    if (this.innerCore) {
      this.innerCore.rotation.x = elapsed * 0.5;
      this.innerCore.rotation.z = elapsed * 0.3;
      
      // Pulsate
      const pulse = 1 + Math.sin(elapsed * 2) * 0.1;
      this.innerCore.scale.setScalar(pulse);
    }
    
    // Outer shell opposite rotation
    if (this.outerShell) {
      this.outerShell.rotation.y = -elapsed * 0.1;
      this.outerShell.rotation.z = elapsed * 0.08;
    }
    
    // React to scroll
    const reactScale = 1 + this.scrollProgress * 0.2;
    this.centralObject.scale.setScalar(reactScale);
  }

  updateOrbitals(elapsed) {
    this.orbitals.forEach((orbital, i) => {
      if (orbital.userData.angle !== undefined) {
        const data = orbital.userData;
        const newAngle = data.angle + elapsed * data.speed;
        
        orbital.position.x = Math.cos(newAngle) * data.radius;
        orbital.position.z = Math.sin(newAngle) * data.radius;
        orbital.position.y = data.height + Math.sin(elapsed * 0.5 + data.phase) * 5;
        
        orbital.rotation.x = elapsed * 0.5;
        orbital.rotation.y = elapsed * 0.3;
      }
    });
  }

  updateLighting(elapsed) {
    // Key light circles
    const keyAngle = elapsed * 0.2;
    this.keyLight.position.x = Math.cos(keyAngle) * 60;
    this.keyLight.position.z = Math.sin(keyAngle) * 60;
    
    // Rim light pulses
    this.rimLight.intensity = 1.5 + Math.sin(elapsed) * 0.5;
    
    // Ground glow reacts to scroll
    this.groundGlow.intensity = 0.5 + this.scrollProgress * 1.5;
  }

  animateIn() {
    const camera = this.sceneManager.getCamera();
    camera.position.set(150, 50, 0);
    camera.lookAt(0, 0, 0);
    
    // Dramatic zoom in
    gsap.to(camera.position, {
      x: 100,
      y: 30,
      duration: 2,
      ease: 'power2.out'
    });
    
    // Central object reveals
    gsap.to(this.centralGroup.scale, {
      x: 1,
      y: 1,
      z: 1,
      duration: 1.5,
      delay: 0.5,
      ease: 'elastic.out(1, 0.5)'
    });
  }

  start() {
    if (this.sceneManager) {
      this.sceneManager.start();
      this.animateIn();
    }
  }

  pause() {
    if (this.sceneManager) {
      this.sceneManager.stop();
    }
  }

  onScroll(scrollY, scrollLimit) {
    if (scrollLimit > 0) {
      this.scrollProgress = Math.max(0, Math.min(1, scrollY / scrollLimit));
    }
  }

  destroy() {
    if (this.mouseMoveHandler) {
      window.removeEventListener('mousemove', this.mouseMoveHandler);
    }
    if (this.sectionObserver) {
      this.sectionObserver.disconnect();
    }
    if (this.lighting) this.lighting.dispose();
    if (this.sceneManager) this.sceneManager.dispose();
  }

  dispose() {
    this.destroy();
  }
}
