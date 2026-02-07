/**
 * Aurora Aqua - About Page Scene
 * VERTICAL DESCENT THROUGH MEANING
 * 
 * Camera descends through massive geometric layers.
 * Pass THROUGH geometry, break symmetry, use depth aggressively.
 * Each layer represents a phase of the company story.
 */

import { SceneManager } from '../three/SceneManager.js';
import { ParticleSystem } from '../three/ParticleSystem.js';
import { LightingSetup } from '../three/LightingSetup.js';
import { isMobile, getPerformanceTier } from '../utils/device.js';
import * as THREE from 'three';
import gsap from 'gsap';

export class AboutScene {
  constructor(container) {
    this.container = container;
    this.sceneManager = null;
    this.particles = [];
    this.lighting = null;
    this.scrollProgress = 0;
    this.performanceTier = getPerformanceTier();
    this.isMobile = isMobile();
    
    // Geometry layers we descend through
    this.storyLayers = [];
    this.currentLayer = 0;
    
    // Massive structural elements
    this.structuralElements = [];
    
    // Irreversible: once we pass a threshold, the layer above collapses
    this.collapsedLayers = new Set();
    
    console.log('📖 AboutScene: Creating DESCENT experience...', { tier: this.performanceTier });
    this.init();
  }

  init() {
    this.sceneManager = new SceneManager(this.container);
    const scene = this.sceneManager.getScene();
    
    // Gradient fog that changes with depth
    scene.fog = new THREE.FogExp2(0x041e42, 0.004);
    
    // Lighting
    this.lighting = new LightingSetup(scene);
    this.setupLayeredLighting();
    
    // === STORY LAYERS - Massive geometry we descend through ===
    this.createStoryLayers();
    
    // === STRUCTURAL ELEMENTS ===
    this.createStructuralElements();
    
    // === PARTICLES ===
    this.createParticles();
    
    // Camera
    this.setupCamera();
    
    // Update
    this.sceneManager.onUpdate((delta, elapsed) => {
      this.update(delta, elapsed);
    });
    
    console.log('✅ AboutScene: DESCENT ready');
  }

  setupLayeredLighting() {
    const scene = this.sceneManager.getScene();
    
    // Light from above (origin)
    this.originLight = new THREE.PointLight(0x67e8f9, 3, 300);
    this.originLight.position.set(0, 100, 0);
    scene.add(this.originLight);
    
    // Layer-specific lights
    this.layerLights = [];
    const depths = [50, -50, -150, -300];
    const colors = [0x67e8f9, 0x22d3ee, 0x0891b2, 0x06b6d4];
    
    depths.forEach((y, i) => {
      const light = new THREE.PointLight(colors[i], 0, 150);
      light.position.set(0, y, 0);
      scene.add(light);
      this.layerLights.push(light);
    });
    
    // Destination light (the goal)
    this.destinationLight = new THREE.PointLight(0x22d3ee, 0, 200);
    this.destinationLight.position.set(0, -400, 0);
    scene.add(this.destinationLight);
  }

  createStoryLayers() {
    const scene = this.sceneManager.getScene();
    
    // Layer 1: ORIGIN - Surface rings (where we came from)
    const layer1 = this.createOriginLayer();
    layer1.position.y = 80;
    this.storyLayers.push({ mesh: layer1, y: 80, collapsed: false, name: 'origin' });
    scene.add(layer1);
    
    // Layer 2: GROWTH - Organic expanding forms
    const layer2 = this.createGrowthLayer();
    layer2.position.y = 0;
    this.storyLayers.push({ mesh: layer2, y: 0, collapsed: false, name: 'growth' });
    scene.add(layer2);
    
    // Layer 3: TECHNOLOGY - Geometric precision
    const layer3 = this.createTechnologyLayer();
    layer3.position.y = -120;
    this.storyLayers.push({ mesh: layer3, y: -120, collapsed: false, name: 'technology' });
    scene.add(layer3);
    
    // Layer 4: VISION - The destination, expansive and bold
    const layer4 = this.createVisionLayer();
    layer4.position.y = -280;
    this.storyLayers.push({ mesh: layer4, y: -280, collapsed: false, name: 'vision' });
    scene.add(layer4);
  }

  createOriginLayer() {
    const group = new THREE.Group();
    
    // Massive concentric rings
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x67e8f9,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
      wireframe: true
    });
    
    for (let i = 0; i < 5; i++) {
      const size = 30 + i * 25;
      const geo = new THREE.RingGeometry(size * 0.7, size, 64);
      const ring = new THREE.Mesh(geo, ringMat.clone());
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = i * 3;
      ring.material.opacity = 0.12 - i * 0.02;
      group.add(ring);
    }
    
    // Central sphere (origin point)
    const sphereGeo = new THREE.SphereGeometry(15, 32, 32);
    const sphereMat = new THREE.MeshPhysicalMaterial({
      color: 0x22d3ee,
      emissive: 0x0891b2,
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0.6,
      metalness: 0.5,
      roughness: 0.3
    });
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    group.add(sphere);
    
    return group;
  }

  createGrowthLayer() {
    const group = new THREE.Group();
    
    // Organic tube network
    const tubeMat = new THREE.MeshPhysicalMaterial({
      color: 0x0891b2,
      emissive: 0x041e42,
      emissiveIntensity: 0.2,
      transparent: true,
      opacity: 0.7,
      metalness: 0.3,
      roughness: 0.5
    });
    
    // Multiple organic curves
    const curves = [
      [new THREE.Vector3(-60, 20, 0), new THREE.Vector3(-20, -10, 30), new THREE.Vector3(20, 10, -20), new THREE.Vector3(60, -20, 0)],
      [new THREE.Vector3(0, 30, -50), new THREE.Vector3(30, 0, -10), new THREE.Vector3(-10, -20, 30), new THREE.Vector3(-40, 10, 50)],
      [new THREE.Vector3(50, 15, 40), new THREE.Vector3(10, -15, 0), new THREE.Vector3(-30, 5, -30), new THREE.Vector3(-60, -10, 20)],
    ];
    
    curves.forEach((points, i) => {
      if (this.isMobile && i > 0) return;
      
      const curve = new THREE.CatmullRomCurve3(points);
      const tubeGeo = new THREE.TubeGeometry(curve, 64, 2 + i * 0.5, 12, false);
      const tube = new THREE.Mesh(tubeGeo, tubeMat.clone());
      tube.material.opacity = 0.6 - i * 0.1;
      group.add(tube);
    });
    
    // Growth nodes
    if (!this.isMobile) {
      const nodeGeo = new THREE.IcosahedronGeometry(4, 1);
      const nodeMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.5 });
      
      for (let i = 0; i < 8; i++) {
        const node = new THREE.Mesh(nodeGeo, nodeMat.clone());
        node.position.set(
          (Math.random() - 0.5) * 100,
          (Math.random() - 0.5) * 40,
          (Math.random() - 0.5) * 100
        );
        group.add(node);
      }
    }
    
    return group;
  }

  createTechnologyLayer() {
    const group = new THREE.Group();
    
    // Precision grid
    const gridSize = 120;
    const gridMat = new THREE.LineBasicMaterial({ color: 0x0891b2, transparent: true, opacity: 0.2 });
    
    // Horizontal grid
    for (let i = -6; i <= 6; i++) {
      const points = [new THREE.Vector3(-gridSize/2, 0, i * 10), new THREE.Vector3(gridSize/2, 0, i * 10)];
      const geo = new THREE.BufferGeometry().setFromPoints(points);
      group.add(new THREE.Line(geo, gridMat));
    }
    for (let i = -6; i <= 6; i++) {
      const points = [new THREE.Vector3(i * 10, 0, -gridSize/2), new THREE.Vector3(i * 10, 0, gridSize/2)];
      const geo = new THREE.BufferGeometry().setFromPoints(points);
      group.add(new THREE.Line(geo, gridMat));
    }
    
    // Central tech structure
    const boxGeo = new THREE.BoxGeometry(25, 25, 25);
    const boxMat = new THREE.MeshPhysicalMaterial({
      color: 0x0891b2,
      metalness: 0.9,
      roughness: 0.1,
      transparent: true,
      opacity: 0.4,
      wireframe: true
    });
    const box = new THREE.Mesh(boxGeo, boxMat);
    box.rotation.x = Math.PI / 4;
    box.rotation.z = Math.PI / 4;
    group.add(box);
    
    // Orbiting data points
    if (!this.isMobile) {
      const dataGeo = new THREE.OctahedronGeometry(2);
      const dataMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee });
      
      for (let i = 0; i < 12; i++) {
        const data = new THREE.Mesh(dataGeo, dataMat);
        const angle = (i / 12) * Math.PI * 2;
        const radius = 35 + (i % 3) * 10;
        data.position.set(Math.cos(angle) * radius, (i % 2) * 10 - 5, Math.sin(angle) * radius);
        data.userData.angle = angle;
        data.userData.radius = radius;
        group.add(data);
      }
    }
    
    return group;
  }

  createVisionLayer() {
    const group = new THREE.Group();
    
    // Expansive final destination
    const torusGeo = new THREE.TorusKnotGeometry(40, 12, 100, 16);
    const torusMat = new THREE.MeshPhysicalMaterial({
      color: 0x22d3ee,
      emissive: 0x0891b2,
      emissiveIntensity: 0.4,
      metalness: 0.7,
      roughness: 0.2,
      transparent: true,
      opacity: 0.8
    });
    const torus = new THREE.Mesh(torusGeo, torusMat);
    torus.scale.setScalar(0);
    torus.userData.isDestination = true;
    group.add(torus);
    
    // Surrounding rings
    for (let i = 0; i < 3; i++) {
      const ringGeo = new THREE.TorusGeometry(70 + i * 30, 1, 8, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x67e8f9,
        transparent: true,
        opacity: 0.2 - i * 0.05
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.scale.setScalar(0);
      ring.userData.delay = i * 0.1;
      group.add(ring);
    }
    
    return group;
  }

  createStructuralElements() {
    const scene = this.sceneManager.getScene();
    
    // Vertical descent tunnel - asymmetric
    const tunnelMat = new THREE.MeshBasicMaterial({
      color: 0x0891b2,
      transparent: true,
      opacity: 0.04,
      side: THREE.DoubleSide
    });
    
    // Left wall
    const wall1Geo = new THREE.PlaneGeometry(10, 500);
    const wall1 = new THREE.Mesh(wall1Geo, tunnelMat.clone());
    wall1.position.set(-100, -150, 0);
    wall1.rotation.y = Math.PI / 2.5;
    scene.add(wall1);
    this.structuralElements.push(wall1);
    
    // Right wall - different angle (asymmetry)
    const wall2 = new THREE.Mesh(wall1Geo, tunnelMat.clone());
    wall2.position.set(80, -150, 20);
    wall2.rotation.y = -Math.PI / 3;
    scene.add(wall2);
    this.structuralElements.push(wall2);
  }

  createParticles() {
    const configs = [
      { size: 0.4, spread: { x: 150, y: 400, z: 150 }, speed: 0.2, color1: 0x22d3ee, color2: 0x67e8f9 },
    ];
    
    if (this.performanceTier !== 'low') {
      configs.push({ size: 0.25, spread: { x: 200, y: 500, z: 200 }, speed: 0.1, color1: 0x0891b2, color2: 0x22d3ee });
    }
    
    configs.forEach(config => {
      const particles = new ParticleSystem({
        size: this.isMobile ? config.size * 0.5 : config.size,
        spread: config.spread,
        speed: config.speed,
        color1: config.color1,
        color2: config.color2
      });
      particles.mesh.position.y = -100;
      this.particles.push(particles);
      this.sceneManager.addObject(particles);
    });
  }

  setupCamera() {
    const camera = this.sceneManager.getCamera();
    
    this.cameraPath = {
      startY: 120,
      endY: -350,
      startZ: 80,
      endZ: 40
    };
    
    camera.position.set(0, this.cameraPath.startY, this.cameraPath.startZ);
    camera.lookAt(0, 50, 0);
  }

  update(delta, elapsed) {
    this.lighting.update(elapsed);
    this.updateCamera(elapsed);
    this.updateLayers(elapsed);
    this.updateLighting();
    this.checkLayerCollapse();
  }

  updateCamera(elapsed) {
    const camera = this.sceneManager.getCamera();
    const progress = this.scrollProgress;
    
    // Vertical descent path
    const targetY = this.cameraPath.startY + (this.cameraPath.endY - this.cameraPath.startY) * progress;
    const targetZ = this.cameraPath.startZ + (this.cameraPath.endZ - this.cameraPath.startZ) * progress;
    
    // Add dramatic sway - break symmetry
    const swayX = Math.sin(elapsed * 0.3 + progress * 5) * (10 + progress * 15);
    const swayZ = Math.cos(elapsed * 0.25) * 8;
    
    camera.position.x += (swayX - camera.position.x) * 0.03;
    camera.position.y += (targetY - camera.position.y) * 0.04;
    camera.position.z += (targetZ + swayZ - camera.position.z) * 0.03;
    
    // Look ahead on the descent
    const lookY = camera.position.y - 50 - progress * 30;
    camera.lookAt(swayX * 0.3, lookY, -30);
    
    // Slight roll for drama
    camera.rotation.z = Math.sin(progress * Math.PI * 2) * 0.03;
  }

  updateLayers(elapsed) {
    this.storyLayers.forEach((layer, i) => {
      const mesh = layer.mesh;
      
      // Rotate layers gently
      mesh.rotation.y = elapsed * 0.05 * (i % 2 ? 1 : -1);
      
      // Animate children
      mesh.children.forEach((child, j) => {
        if (child.userData.isDestination) {
          // Destination pulsates
          const pulse = 1 + Math.sin(elapsed * 2) * 0.05;
          child.rotation.x = elapsed * 0.2;
          child.rotation.y = elapsed * 0.15;
        }
        if (child.userData.angle !== undefined) {
          // Orbiting elements
          const newAngle = child.userData.angle + elapsed * 0.3;
          child.position.x = Math.cos(newAngle) * child.userData.radius;
          child.position.z = Math.sin(newAngle) * child.userData.radius;
        }
      });
    });
  }

  updateLighting() {
    const progress = this.scrollProgress;
    
    // Origin light fades as we descend
    this.originLight.intensity = Math.max(0, 3 - progress * 4);
    
    // Layer lights activate as we pass
    this.layerLights.forEach((light, i) => {
      const layerProgress = i / 4;
      const distance = Math.abs(progress - layerProgress);
      light.intensity = Math.max(0, 2 - distance * 8);
    });
    
    // Destination light grows
    this.destinationLight.intensity = Math.max(0, (progress - 0.6) * 8);
    
    // Fog changes color with depth
    const scene = this.sceneManager.getScene();
    scene.fog.density = 0.003 + progress * 0.006;
  }

  checkLayerCollapse() {
    const progress = this.scrollProgress;
    
    // Collapse passed layers (irreversible visual moment)
    this.storyLayers.forEach((layer, i) => {
      const layerThreshold = (i + 1) * 0.2;
      
      if (progress > layerThreshold + 0.1 && !layer.collapsed) {
        this.collapseLayer(i);
      }
      
      // Reveal destination layer
      if (i === 3 && progress > 0.65) {
        const revealProgress = (progress - 0.65) / 0.35;
        layer.mesh.children.forEach((child, j) => {
          const delay = child.userData.delay || 0;
          const p = Math.max(0, revealProgress - delay);
          child.scale.setScalar(p * 1.2);
        });
      }
    });
  }

  collapseLayer(index) {
    const layer = this.storyLayers[index];
    if (layer.collapsed) return;
    
    layer.collapsed = true;
    console.log(`💫 Layer ${index} collapsed: ${layer.name}`);
    
    // Animate collapse
    gsap.to(layer.mesh.scale, {
      x: 0.3,
      y: 0.1,
      z: 0.3,
      duration: 1.5,
      ease: 'power2.in'
    });
    
    gsap.to(layer.mesh.position, {
      y: layer.y + 20,
      duration: 1.5,
      ease: 'power2.in'
    });
    
    layer.mesh.children.forEach(child => {
      if (child.material) {
        gsap.to(child.material, {
          opacity: 0,
          duration: 1,
          delay: 0.3
        });
      }
    });
  }

  animateIn() {
    const camera = this.sceneManager.getCamera();
    camera.position.set(0, 160, 100);
    camera.lookAt(0, 80, 0);
    
    gsap.to(camera.position, {
      y: 120,
      z: 80,
      duration: 2.5,
      ease: 'power2.out'
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
    if (this.lighting) this.lighting.dispose();
    if (this.sceneManager) this.sceneManager.dispose();
  }

  dispose() {
    this.destroy();
  }
}
