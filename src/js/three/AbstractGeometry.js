/**
 * Aurora Aqua - Abstract Geometry
 * Floating abstract shapes representing aquaculture elements
 */

import * as THREE from 'three';
import { isMobile } from '../utils/device.js';

export class AbstractGeometry {
  constructor(options = {}) {
    this.type = options.type || 'default';
    this.position = options.position || { x: 0, y: 0, z: 0 };
    this.scale = options.scale || 1;
    this.color = options.color || 0x2dd4bf;
    
    this.group = new THREE.Group();
    this.meshes = [];
    
    this.init();
  }

  init() {
    switch (this.type) {
      case 'tank':
        this.createTankGeometry();
        break;
      case 'flow':
        this.createFlowGeometry();
        break;
      case 'grid':
        this.createGridGeometry();
        break;
      case 'helix':
        this.createHelixGeometry();
        break;
      case 'sphere-cluster':
        this.createSphereCluster();
        break;
      default:
        this.createDefaultGeometry();
    }
    
    this.group.position.set(this.position.x, this.position.y, this.position.z);
    this.group.scale.setScalar(this.scale);
  }

  createDefaultGeometry() {
    // Floating torus knot
    const geometry = new THREE.TorusKnotGeometry(5, 1.5, 100, 16);
    const material = new THREE.MeshPhysicalMaterial({
      color: this.color,
      metalness: 0.3,
      roughness: 0.4,
      transparent: true,
      opacity: 0.8,
      emissive: this.color,
      emissiveIntensity: 0.1,
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    this.meshes.push(mesh);
    this.group.add(mesh);
  }

  createTankGeometry() {
    // Abstract aquaculture tank representation
    const tankMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x14a3a8,
      metalness: 0.1,
      roughness: 0.3,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
    });
    
    // Outer cylinder (tank)
    const outerGeometry = new THREE.CylinderGeometry(8, 8, 12, 32, 1, true);
    const outerMesh = new THREE.Mesh(outerGeometry, tankMaterial);
    this.meshes.push(outerMesh);
    this.group.add(outerMesh);
    
    // Inner rings
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: this.color,
      transparent: true,
      opacity: 0.6,
    });
    
    for (let i = 0; i < 5; i++) {
      const ringGeometry = new THREE.TorusGeometry(8.2, 0.1, 8, 64);
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = -4 + i * 2;
      this.meshes.push(ring);
      this.group.add(ring);
    }
  }

  createFlowGeometry() {
    // Tube representing water flow
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-15, 0, 0),
      new THREE.Vector3(-8, 3, 5),
      new THREE.Vector3(0, -2, 3),
      new THREE.Vector3(8, 4, -2),
      new THREE.Vector3(15, 0, 0),
    ]);
    
    const tubeGeometry = new THREE.TubeGeometry(curve, 64, 0.8, 12, false);
    const tubeMaterial = new THREE.MeshPhysicalMaterial({
      color: this.color,
      metalness: 0.2,
      roughness: 0.5,
      transparent: true,
      opacity: 0.7,
      emissive: this.color,
      emissiveIntensity: 0.05,
    });
    
    const tube = new THREE.Mesh(tubeGeometry, tubeMaterial);
    this.meshes.push(tube);
    this.group.add(tube);
    
    // Add flowing particles along the tube
    const particleCount = isMobile() ? 20 : 50;
    const particleGeometry = new THREE.SphereGeometry(0.3, 8, 8);
    const particleMaterial = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.8,
    });
    
    for (let i = 0; i < particleCount; i++) {
      const particle = new THREE.Mesh(particleGeometry, particleMaterial.clone());
      const t = i / particleCount;
      const point = curve.getPoint(t);
      particle.position.copy(point);
      particle.userData.t = t;
      particle.userData.curve = curve;
      this.meshes.push(particle);
      this.group.add(particle);
    }
  }

  createGridGeometry() {
    // Grid representing farming structure
    const gridMaterial = new THREE.LineBasicMaterial({
      color: this.color,
      transparent: true,
      opacity: 0.5,
    });
    
    const gridSize = 20;
    const divisions = 10;
    
    // Horizontal lines
    for (let i = 0; i <= divisions; i++) {
      const points = [];
      const y = (i / divisions - 0.5) * gridSize;
      points.push(new THREE.Vector3(-gridSize / 2, y, 0));
      points.push(new THREE.Vector3(gridSize / 2, y, 0));
      
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, gridMaterial);
      this.group.add(line);
    }
    
    // Vertical lines
    for (let i = 0; i <= divisions; i++) {
      const points = [];
      const x = (i / divisions - 0.5) * gridSize;
      points.push(new THREE.Vector3(x, -gridSize / 2, 0));
      points.push(new THREE.Vector3(x, gridSize / 2, 0));
      
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, gridMaterial);
      this.group.add(line);
    }
    
    // Add intersection spheres
    const nodeMaterial = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.8,
    });
    
    for (let i = 0; i <= divisions; i += 2) {
      for (let j = 0; j <= divisions; j += 2) {
        const nodeGeometry = new THREE.SphereGeometry(0.2, 8, 8);
        const node = new THREE.Mesh(nodeGeometry, nodeMaterial);
        node.position.set(
          (i / divisions - 0.5) * gridSize,
          (j / divisions - 0.5) * gridSize,
          0
        );
        this.meshes.push(node);
        this.group.add(node);
      }
    }
  }

  createHelixGeometry() {
    // DNA-like helix representing biotechnology
    const helixMaterial = new THREE.MeshPhysicalMaterial({
      color: this.color,
      metalness: 0.3,
      roughness: 0.4,
      transparent: true,
      opacity: 0.8,
    });
    
    const radius = 4;
    const height = 20;
    const turns = 3;
    const pointsPerTurn = 24;
    const totalPoints = turns * pointsPerTurn;
    
    // Create two intertwined helixes
    for (let helix = 0; helix < 2; helix++) {
      const points = [];
      const offset = helix * Math.PI;
      
      for (let i = 0; i <= totalPoints; i++) {
        const t = i / totalPoints;
        const angle = t * turns * Math.PI * 2 + offset;
        const y = (t - 0.5) * height;
        
        points.push(new THREE.Vector3(
          Math.cos(angle) * radius,
          y,
          Math.sin(angle) * radius
        ));
      }
      
      const curve = new THREE.CatmullRomCurve3(points);
      const tubeGeometry = new THREE.TubeGeometry(curve, totalPoints, 0.3, 8, false);
      const tube = new THREE.Mesh(tubeGeometry, helixMaterial);
      this.meshes.push(tube);
      this.group.add(tube);
    }
    
    // Add connecting bars
    const barMaterial = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.6,
    });
    
    for (let i = 0; i < totalPoints; i += 4) {
      const t = i / totalPoints;
      const angle = t * turns * Math.PI * 2;
      const y = (t - 0.5) * height;
      
      const barGeometry = new THREE.CylinderGeometry(0.1, 0.1, radius * 2, 8);
      const bar = new THREE.Mesh(barGeometry, barMaterial);
      bar.position.y = y;
      bar.rotation.z = Math.PI / 2;
      bar.rotation.y = angle;
      this.meshes.push(bar);
      this.group.add(bar);
    }
  }

  createSphereCluster() {
    // Cluster of spheres representing molecular/organic structure
    const sphereCount = isMobile() ? 15 : 30;
    
    const baseMaterial = new THREE.MeshPhysicalMaterial({
      color: this.color,
      metalness: 0.2,
      roughness: 0.5,
      transparent: true,
      opacity: 0.7,
      emissive: this.color,
      emissiveIntensity: 0.05,
    });
    
    for (let i = 0; i < sphereCount; i++) {
      const size = 0.5 + Math.random() * 2;
      const geometry = new THREE.SphereGeometry(size, 16, 16);
      const material = baseMaterial.clone();
      material.opacity = 0.4 + Math.random() * 0.4;
      
      const sphere = new THREE.Mesh(geometry, material);
      
      // Position in a clustered pattern
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 3 + Math.random() * 8;
      
      sphere.position.set(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      );
      
      sphere.userData.originalPosition = sphere.position.clone();
      sphere.userData.phase = Math.random() * Math.PI * 2;
      sphere.userData.speed = 0.5 + Math.random() * 0.5;
      
      this.meshes.push(sphere);
      this.group.add(sphere);
    }
  }

  update(delta, elapsed) {
    // Rotate the entire group gently
    this.group.rotation.y += delta * 0.1;
    
    // Animate individual meshes based on type
    if (this.type === 'flow') {
      this.meshes.forEach(mesh => {
        if (mesh.userData.curve) {
          let t = mesh.userData.t + delta * 0.1;
          if (t > 1) t = 0;
          mesh.userData.t = t;
          const point = mesh.userData.curve.getPoint(t);
          mesh.position.copy(point);
        }
      });
    }
    
    if (this.type === 'sphere-cluster') {
      this.meshes.forEach(mesh => {
        if (mesh.userData.originalPosition) {
          const pos = mesh.userData.originalPosition;
          const phase = mesh.userData.phase;
          const speed = mesh.userData.speed;
          
          mesh.position.x = pos.x + Math.sin(elapsed * speed + phase) * 0.5;
          mesh.position.y = pos.y + Math.cos(elapsed * speed * 0.7 + phase) * 0.5;
          mesh.position.z = pos.z + Math.sin(elapsed * speed * 0.5 + phase) * 0.5;
        }
      });
    }
  }

  getMesh() {
    return this.group;
  }

  dispose() {
    this.meshes.forEach(mesh => {
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach(m => m.dispose());
        } else {
          mesh.material.dispose();
        }
      }
    });
  }
}
