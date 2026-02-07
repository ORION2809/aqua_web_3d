/**
 * Aurora Aqua - Services Scene
 * PRODUCTION DOCTRINE BUILD
 * 
 * SIGNATURE OBJECT SYSTEM
 * 
 * If the object can be named, it is wrong.
 * Services do not feel like a website section.
 */

import { SceneManager } from '../three/SceneManager.js';
import { ParticleSystem } from '../three/ParticleSystem.js';
import { LightingSetup } from '../three/LightingSetup.js';
import { isMobile, getPerformanceTier } from '../utils/device.js';
import * as THREE from 'three';
import gsap from 'gsap';
import { PostProcessing } from '../three/PostProcessing.js';
import { userIntent } from '../utils/UserIntent.js';

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
    
    // SIGNATURE OBJECT - 3 concentric rings
    this.signatureRings = [];
    this.signatureGroup = null;
    this.ringMaterials = [];
    
    // Deformation state
    this.deformationBias = 0;
    this.activeServiceIndex = 0;
    
    // Mouse
    this.mousePosition = { x: 0.5, y: 0.5 };
    this.mouseTarget = { x: 0, y: 0 };
    
    // Post-processing
    this.postProcessing = null;
    
    // Interactive hover — mouse proximity warps the world
    this.mouseSpeed = 0;
    this.lastMouseX = 0;
    this.lastMouseY = 0;
    
    // THE REFUSAL — object disobeys once per visit (any service, including 0)
    this.refusalIndex = Math.floor(Math.random() * 4);
    this.refusalTriggered = false;
    this.refusalActive = false;
    this.refusalStart = 0;
    this.pendingService = null;
    this.frozenTimeOffset = 0;
    
    // THE SCAR — permanent physics corruption from home page fracture
    // If the fracture has occurred, this page inherits the damage.
    this.isScarred = false;
    this.scarOffsets = { cameraLerp: 0, fog: 0, roll: 0 };
    try {
      if (sessionStorage.getItem('aurora_scarred') === 'true') {
        this.isScarred = true;
        this.scarOffsets = { cameraLerp: -0.005, fog: 0.006, roll: 0.012 };
      }
    } catch(e) {}
    
    // THE GHOST — silent second fracture
    // No announcement. No recovery. No proof it happened.
    // A compound micro-event the user will question was real.
    this.ghostTriggered = false;
    this.ghostTime = 8 + Math.random() * 17;
    this.ghostCameraDrift = 0;
    this.ghostFogOffset = 0;
    
    // ═══ USER-INTENT STATE (REQ 1/5/6) ═══
    this.intentCameraLerp = 0.03;
    this.showcaseDwellLevel = 0;       // 0=passive, 1=revealed, 2=expanded
    this.signatureEmotionalBias = 0;   // emotional phase deforms signature
    
    this.init();
  }

  init() {
    this.sceneManager = new SceneManager(this.container);
    const scene = this.sceneManager.getScene();
    
    // Post-processing pipeline
    this.postProcessing = new PostProcessing(
      this.sceneManager.getRenderer(),
      scene,
      this.sceneManager.getCamera()
    );
    this.postProcessing.setZone('twilight');
    
    // Route all rendering through post-processing pipeline
    this.sceneManager.setRenderOverride((delta) => {
      this.postProcessing.render(delta);
    });
    
    // Fog that lies - breathing density
    scene.fog = new THREE.FogExp2(0x021020, 0.04);
    
    this.lighting = new LightingSetup(scene);
    this.setupDramaticLighting();
    
    // THE SIGNATURE OBJECT
    this.createSignatureObject();
    
    // Environment
    this.createEnvironment();
    
    // Particles
    this.createParticles();
    
    // Camera
    this.setupCamera();
    
    // Mouse with resistance
    this.setupMouseHandler();
    
    // Service mutation observer
    this.setupServiceObserver();
    
    // THE SCAR — listen for fracture corruption from home page
    this.scarListener = () => {
      this.isScarred = true;
      this.scarOffsets = { cameraLerp: -0.005, fog: 0.006, roll: 0.012 };
    };
    window.addEventListener('physicsScar', this.scarListener);
    
    // Update loop
    this.sceneManager.onUpdate((delta, elapsed) => {
      this.update(delta, elapsed);
    });
    
    // Click ripple handler
    this.clickHandler = (e) => {
      if (this.postProcessing) {
        this.postProcessing.triggerRipple(
          e.clientX / window.innerWidth,
          e.clientY / window.innerHeight
        );
      }
    };
    window.addEventListener('click', this.clickHandler);
    
    // IDEA 6: Interactive product showcase
    this.createProductShowcase();
  }

  setupDramaticLighting() {
    const scene = this.sceneManager.getScene();
    
    // Key light
    this.keyLight = new THREE.SpotLight(0x67e8f9, 3, 200, Math.PI / 4, 0.5, 1);
    this.keyLight.position.set(50, 80, 50);
    this.keyLight.target.position.set(0, 0, 0);
    scene.add(this.keyLight);
    scene.add(this.keyLight.target);
    
    // Fill light
    this.fillLight = new THREE.PointLight(0x0891b2, 1.5, 150);
    this.fillLight.position.set(-60, -20, -40);
    scene.add(this.fillLight);
    
    // Rim light
    this.rimLight = new THREE.PointLight(0x22d3ee, 2, 100);
    this.rimLight.position.set(0, 30, -60);
    scene.add(this.rimLight);
    
    // Ground glow
    this.groundGlow = new THREE.PointLight(0x0891b2, 1, 100);
    this.groundGlow.position.set(0, -50, 0);
    scene.add(this.groundGlow);
  }

  // ═══════════════════════════════════════════════════════════
  // THE SIGNATURE OBJECT
  // 3 concentric rings, each distorted tube
  // Each ring rotates on different axis
  // Each ring has different deformation frequency
  // ═══════════════════════════════════════════════════════════

  createSignatureObject() {
    const scene = this.sceneManager.getScene();
    
    this.signatureGroup = new THREE.Group();
    
    // Ring configurations - different radii, noise offsets, rotation axes
    const ringConfigs = [
      { radius: 30, noiseOffset: 0, rotationAxis: 'y', speed: 0.3, deformFreq: 0.08 },
      { radius: 24, noiseOffset: Math.PI * 0.66, rotationAxis: 'x', speed: 0.2, deformFreq: 0.12 },
      { radius: 18, noiseOffset: Math.PI * 1.33, rotationAxis: 'z', speed: 0.4, deformFreq: 0.06 }
    ];
    
    ringConfigs.forEach((config, index) => {
      const ring = this.createDistortedRing(config, index);
      this.signatureRings.push(ring);
      this.signatureGroup.add(ring.mesh);
    });
    
    scene.add(this.signatureGroup);
  }

  createDistortedRing(config, index) {
    // CatmullRom curve for the ring path
    const points = Array.from({ length: 12 }, (_, i) => {
      const a = (i / 12) * Math.PI * 2;
      return new THREE.Vector3(
        Math.cos(a) * config.radius,
        Math.sin(a * 2) * 10,
        Math.sin(a) * config.radius
      );
    });
    
    const curve = new THREE.CatmullRomCurve3(points, true);
    
    // Tube geometry
    const geometry = new THREE.TubeGeometry(curve, 240, 2.5, 12, true);
    
    // Store original positions for deformation
    const positionAttribute = geometry.getAttribute('position');
    const originalPositions = new Float32Array(positionAttribute.array.length);
    originalPositions.set(positionAttribute.array);
    geometry.userData.originalPositions = originalPositions;
    
    // Store normals for deformation
    geometry.computeVertexNormals();
    const normalAttribute = geometry.getAttribute('normal');
    const normals = new Float32Array(normalAttribute.array.length);
    normals.set(normalAttribute.array);
    geometry.userData.normals = normals;
    
    // Material with custom shader for deformation
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uNoiseOffset: { value: config.noiseOffset },
        uDeformFreq: { value: config.deformFreq },
        uDeformBias: { value: 0 },
        uColor1: { value: new THREE.Color(0x0891b2) },
        uColor2: { value: new THREE.Color(0x22d3ee) },
        uEmissive: { value: new THREE.Color(0x041e42) }
      },
      vertexShader: `
        uniform float uTime;
        uniform float uNoiseOffset;
        uniform float uDeformFreq;
        uniform float uDeformBias;
        
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying float vDeform;
        
        void main() {
          vNormal = normalize(normalMatrix * normal);
          
          // DEFORMATION - mandatory
          // pos += normal * sin(position.y * 0.08 + time * 1.2 + noiseOffset) * 1.8
          float deform = sin(position.y * uDeformFreq + uTime * 1.2 + uNoiseOffset) * 1.8;
          
          // Apply deformation bias from service interaction
          deform *= (1.0 + uDeformBias * 0.5);
          
          vec3 pos = position + normal * deform;
          vDeform = deform;
          vPosition = pos;
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        uniform vec3 uEmissive;
        uniform float uTime;
        
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying float vDeform;
        
        void main() {
          // Color based on deformation
          float t = (vDeform + 1.8) / 3.6;
          vec3 color = mix(uColor1, uColor2, t);
          
          // Fresnel
          vec3 viewDir = normalize(cameraPosition - vPosition);
          float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 3.0);
          color += fresnel * uColor2 * 0.3;
          
          // Emissive pulse
          float pulse = sin(uTime * 2.0 + vPosition.y * 0.1) * 0.5 + 0.5;
          color += uEmissive * pulse * 0.2;
          
          gl_FragColor = vec4(color, 0.9);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide
    });
    
    this.ringMaterials.push(material);
    
    const mesh = new THREE.Mesh(geometry, material);
    
    return {
      mesh,
      config,
      material
    };
  }

  // ═══════════════════════════════════════════════════════════
  // IDEA 6: INTERACTIVE PRODUCT SHOWCASE
  // A 3D data visualization that responds to scroll position
  // Holographic aquaculture metrics floating around the signature object
  // ═══════════════════════════════════════════════════════════

  createProductShowcase() {
    const scene = this.sceneManager.getScene();
    this.showcaseGroup = new THREE.Group();
    this.dataGlyphs = [];
    this.showcaseOrbitAngle = 0;
    
    // 1. Holographic data panels — floating metric displays
    const panelData = [
      { label: 'FEED EFFICIENCY', value: '97.3%', angle: 0, radius: 45, y: 15 },
      { label: 'WATER QUALITY', value: 'A+', angle: Math.PI * 0.5, radius: 42, y: -5 },
      { label: 'FISH HEALTH', value: '99.1%', angle: Math.PI, radius: 48, y: 10 },
      { label: 'GROWTH RATE', value: '+34%', angle: Math.PI * 1.5, radius: 44, y: -10 },
    ];
    
    panelData.forEach((data, i) => {
      const panelGroup = new THREE.Group();
      
      // Glowing data panel frame
      const frameGeo = new THREE.PlaneGeometry(16, 10);
      const frameMat = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uColor: { value: new THREE.Color(0x22d3ee) },
          uActiveService: { value: 0 },
          uIndex: { value: i },
          uHover: { value: 0 },
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float uTime;
          uniform vec3 uColor;
          uniform float uActiveService;
          uniform float uIndex;
          uniform float uHover;
          varying vec2 vUv;
          
          void main() {
            // Frame border
            float border = step(0.03, vUv.x) * step(vUv.x, 0.97) *
                           step(0.05, vUv.y) * step(vUv.y, 0.95);
            float frame = 1.0 - border;
            
            // Scan line effect
            float scanLine = sin(vUv.y * 80.0 + uTime * 2.0) * 0.5 + 0.5;
            scanLine = pow(scanLine, 8.0) * 0.15;
            
            // Data flow pattern
            float dataFlow = sin(vUv.x * 20.0 - uTime * 3.0) * 0.5 + 0.5;
            dataFlow *= step(0.7, vUv.y) * step(vUv.y, 0.8);
            
            // Active service highlight
            float active = 1.0 - abs(uActiveService - uIndex) * 0.3;
            active = clamp(active, 0.3, 1.0);
            
            // Combine
            float alpha = frame * 0.6 + scanLine + dataFlow * 0.3;
            alpha *= active;
            alpha *= (0.3 + uHover * 0.7);
            alpha = clamp(alpha, 0.0, 0.8);
            
            // Color shifts with service
            vec3 color = uColor * active;
            color += vec3(0.1, 0.5, 0.8) * scanLine;
            
            gl_FragColor = vec4(color, alpha);
          }
        `,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      
      const frame = new THREE.Mesh(frameGeo, frameMat);
      panelGroup.add(frame);
      
      // Orbiting data ring around panel
      const ringGeo = new THREE.RingGeometry(3, 3.3, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x22d3ee,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.set(-5, -2, 0.1);
      panelGroup.add(ring);
      
      // Position in orbit around signature object
      panelGroup.position.set(
        Math.cos(data.angle) * data.radius,
        data.y,
        Math.sin(data.angle) * data.radius
      );
      panelGroup.lookAt(0, data.y, 0);
      
      panelGroup.userData = {
        material: frameMat,
        baseAngle: data.angle,
        radius: data.radius,
        baseY: data.y,
        ring: ring,
        ringMat: ringMat,
      };
      
      this.dataGlyphs.push(panelGroup);
      this.showcaseGroup.add(panelGroup);
    });
    
    // 2. Orbiting data points — small spheres representing metrics
    const pointCount = 30;
    for (let i = 0; i < pointCount; i++) {
      const size = 0.3 + Math.random() * 0.5;
      const geo = new THREE.SphereGeometry(size, 8, 6);
      const mat = new THREE.MeshBasicMaterial({
        color: 0x22d3ee,
        transparent: true,
        opacity: 0.5 + Math.random() * 0.3,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      
      const point = new THREE.Mesh(geo, mat);
      const angle = Math.random() * Math.PI * 2;
      const r = 35 + Math.random() * 20;
      const y = (Math.random() - 0.5) * 30;
      
      point.position.set(
        Math.cos(angle) * r,
        y,
        Math.sin(angle) * r
      );
      
      point.userData = {
        orbitSpeed: 0.1 + Math.random() * 0.3,
        orbitRadius: r,
        baseAngle: angle,
        baseY: y,
        bobSpeed: 0.5 + Math.random(),
        bobAmp: 1 + Math.random() * 2,
      };
      
      this.showcaseGroup.add(point);
    }
    
    // 3. Connection lines between data points
    const lineGeo = new THREE.BufferGeometry();
    const linePoints = [];
    for (let i = 0; i < 20; i++) {
      const a1 = Math.random() * Math.PI * 2;
      const a2 = a1 + (Math.random() - 0.5) * 1.5;
      const r1 = 36 + Math.random() * 18;
      const r2 = 36 + Math.random() * 18;
      const y1 = (Math.random() - 0.5) * 25;
      const y2 = (Math.random() - 0.5) * 25;
      linePoints.push(
        Math.cos(a1) * r1, y1, Math.sin(a1) * r1,
        Math.cos(a2) * r2, y2, Math.sin(a2) * r2
      );
    }
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePoints, 3));
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x0891b2,
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const lines = new THREE.LineSegments(lineGeo, lineMat);
    this.showcaseGroup.add(lines);
    this.showcaseLines = lines;
    
    scene.add(this.showcaseGroup);
  }

  createEnvironment() {
    const scene = this.sceneManager.getScene();
    
    // Ground - subtle
    const groundGeo = new THREE.CircleGeometry(100, 64);
    const groundMat = new THREE.MeshBasicMaterial({
      color: 0x0891b2,
      transparent: true,
      opacity: 0.03,
      side: THREE.DoubleSide
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -50;
    scene.add(ground);
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
    // Add mesh to scene but DON'T register for SceneManager update
    // We update particles manually in update() with camera position for bioluminescence
    const mesh = particles.mesh || particles.getMesh?.();
    if (mesh) this.sceneManager.getScene().add(mesh);
  }

  setupCamera() {
    const camera = this.sceneManager.getCamera();
    
    this.cameraState = {
      targetX: 0,
      targetY: 0,
      currentX: 0,
      currentY: 0
    };
    
    camera.position.set(0, 20, 80);
    camera.lookAt(0, 0, 0);
  }

  setupMouseHandler() {
    if (this.isMobile) return;
    
    this.mouseMoveHandler = (e) => {
      this.mouseTarget.x = (e.clientX / window.innerWidth - 0.5) * 2;
      this.mouseTarget.y = (e.clientY / window.innerHeight - 0.5) * 2;
      
      // Track mouse velocity for interactive distortion
      const dx = e.clientX - this.lastMouseX;
      const dy = e.clientY - this.lastMouseY;
      this.mouseSpeed = Math.sqrt(dx * dx + dy * dy);
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    };
    
    window.addEventListener('mousemove', this.mouseMoveHandler);
  }

  // ═══════════════════════════════════════════════════════════
  // SERVICE INTERACTION
  // Scrolling through services MUTATES the object
  // ═══════════════════════════════════════════════════════════

  setupServiceObserver() {
    const sections = document.querySelectorAll('[data-service-section]');
    
    if (sections.length === 0) return;
    
    // Scroll-based service detection (stored for cleanup)
    this.scrollHandler = () => {
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      
      sections.forEach((section, index) => {
        const rect = section.getBoundingClientRect();
        const sectionCenter = rect.top + rect.height / 2;
        
        if (sectionCenter > 0 && sectionCenter < windowHeight) {
          this.setActiveService(index);
        }
      });
    };
    window.addEventListener('scroll', this.scrollHandler);
  }

  setActiveService(index) {
    if (index === this.activeServiceIndex) return;
    
    this.activeServiceIndex = index;
    
    const biases = [-0.5, 0.8, 1.2, 0.0];
    const colors = [
      { c1: 0x0891b2, c2: 0x22d3ee },
      { c1: 0x7c3aed, c2: 0xa78bfa },
      { c1: 0xdc2626, c2: 0xf87171 },
      { c1: 0x059669, c2: 0x34d399 }
    ];
    
    // ═══ THE REFUSAL — the object disobeys. Once. ═══
    if (index === this.refusalIndex && !this.refusalTriggered) {
      this.refusalTriggered = true;
      this.refusalActive = true;
      this.refusalStart = performance.now() / 1000;
      this.pendingService = { index, bias: biases[index] || 0, color: colors[index] || colors[0] };
      // UI updates. Object does not. The disconnect is the point.
      window.dispatchEvent(new CustomEvent('serviceChange', { detail: { index } }));
      return;
    }
    
    // If user scrolls past during refusal, cancel and catch up
    if (this.refusalActive) {
      this.refusalActive = false;
      this.pendingService = null;
    }
    
    this.applyServiceMutation(biases[index] || 0, colors[index] || colors[0]);
    window.dispatchEvent(new CustomEvent('serviceChange', { detail: { index } }));
    
    // Post-processing spike on every service mutation
    if (this.postProcessing) {
      this.postProcessing.spike(1.2, 0.5);
    }
  }

  applyServiceMutation(targetBias, color) {
    gsap.to(this, {
      deformationBias: targetBias,
      duration: 1.3,
      ease: 'power2.out'
    });
    
    this.ringMaterials.forEach(mat => {
      gsap.to(mat.uniforms.uColor1.value, {
        r: new THREE.Color(color.c1).r,
        g: new THREE.Color(color.c1).g,
        b: new THREE.Color(color.c1).b,
        duration: 0.8
      });
      gsap.to(mat.uniforms.uColor2.value, {
        r: new THREE.Color(color.c2).r,
        g: new THREE.Color(color.c2).g,
        b: new THREE.Color(color.c2).b,
        duration: 0.8
      });
    });
  }

  update(delta, elapsed) {
    // ═══ REQ 1: USER INTENT DRIVES EVERYTHING ═══
    userIntent.update(delta);
    userIntent.updatePerceptionShift(delta);
    const intentDelta = delta * userIntent.timeScale; // temporal distortion
    
    if (this.lighting) this.lighting.update(elapsed);
    
    this.updateSignatureObject(elapsed);
    this.updateCamera(elapsed);
    this.updateFog(elapsed);
    this.updateLighting(elapsed);
    this.updateRefusal();
    this.updateGhost(elapsed);
    
    // Pass camera position to bioluminescent particles
    const camera = this.sceneManager.getCamera();
    this.particles.forEach(p => {
      if (p && p.update) p.update(intentDelta, elapsed, camera.position);
    });
    
    // ═══ REQ 1: HOVER DISTORTION SCALED BY USER INTENT ═══
    // Rushing = more distortion. Lingering = world settles.
    if (this.postProcessing && this.mouseSpeed > 0) {
      const intentBoost = 1 + userIntent.rushFactor * 0.5;
      const moveIntensity = Math.min(this.mouseSpeed / 100, 1.0) * intentBoost;
      this.postProcessing.targetDistortion = 0.004 + moveIntensity * 0.008;
      this.postProcessing.targetChromatic = 0.005 + moveIntensity * 0.006;
      this.mouseSpeed *= 0.9;
    }
    
    // ═══ REQ 6: EMOTIONAL PHASE AFFECTS SIGNATURE OBJECT ═══
    // Confrontation → aggressive deformation. Transformation → harmony.
    const phase = userIntent.emotionalPhaseIndex;
    const targetEmoBias = phase === 2 ? 0.6 : phase >= 3 ? -0.2 : 0;
    this.signatureEmotionalBias += (targetEmoBias - this.signatureEmotionalBias) * 0.02;
    
    // ═══ REQ 5: SHOWCASE INTERACTIVITY (state-based, not auto) ═══
    this.updateShowcaseUserDriven(elapsed);
  }

  updateShowcaseUserDriven(elapsed) {
    if (!this.showcaseGroup) return;
    
    const linger = userIntent.lingerFactor;
    const isDwelling = userIntent.cursorDwelling;
    const dwellDuration = userIntent.cursorDwellDuration;
    const rush = userIntent.rushFactor;
    
    // ═══ REQ 5: SHOWCASE DWELL LEVEL STATE MACHINE ═══
    // 0=passive (orbiting glyphs), 1=revealed (linger unlocks detail),
    // 2=expanded (cursor dwell opens full panels)
    let targetLevel = 0;
    if (linger > 0.5) targetLevel = 1;
    if (targetLevel >= 1 && isDwelling && dwellDuration > 1.5) targetLevel = 2;
    // Rushing collapses back to passive
    if (rush > 0.5) targetLevel = 0;
    
    this.showcaseDwellLevel += (targetLevel - this.showcaseDwellLevel) * 0.03;
    const level = this.showcaseDwellLevel;
    
    // Orbit speed responds to intent — rushing accelerates, lingering slows
    const orbitSpeed = 0.001 + rush * 0.004 - linger * 0.0005;
    this.showcaseOrbitAngle = (this.showcaseOrbitAngle || 0) + orbitSpeed;
    this.showcaseGroup.rotation.y = this.showcaseOrbitAngle;
    
    // Update data glyph panels
    this.dataGlyphs.forEach((panel, i) => {
      const ud = panel.userData;
      if (!ud || !ud.material) return;
      
      ud.material.uniforms.uTime.value = elapsed;
      ud.material.uniforms.uActiveService.value = this.activeServiceIndex;
      
      // Float amplitude scales with dwell level — lingering reveals more
      const floatAmp = 2 + level * 1.5;
      panel.position.y = ud.baseY + Math.sin(elapsed * 0.5 + i * 1.5) * floatAmp;
      
      if (ud.ring) {
        ud.ring.rotation.z = elapsed * (0.5 + i * 0.2);
      }
      
      // ═══ REQ 5: Hover detection enhanced by dwell level ═══
      const mouseProx = 1.0 - Math.min(
        Math.abs(this.mousePosition.x - 0.5 + Math.cos(ud.baseAngle + this.showcaseOrbitAngle) * 0.3),
        1.0
      );
      // At level 2, panels glow much brighter
      const hoverTarget = mouseProx * (1 + level * 0.5);
      ud.material.uniforms.uHover.value += (hoverTarget - ud.material.uniforms.uHover.value) * 0.05;
      
      // Scale expansion at level 2
      const scaleTarget = 1 + Math.max(0, level - 1) * 0.2;
      panel.scale.lerp(new THREE.Vector3(scaleTarget, scaleTarget, scaleTarget), 0.02);
    });
    
    // Update orbiting data points
    this.showcaseGroup.children.forEach(child => {
      if (!child.userData || !child.userData.orbitSpeed) return;
      const ud = child.userData;
      const speedMult = 1 + rush * 0.5 - linger * 0.3;
      const angle = ud.baseAngle + elapsed * ud.orbitSpeed * speedMult;
      child.position.x = Math.cos(angle) * ud.orbitRadius;
      child.position.z = Math.sin(angle) * ud.orbitRadius;
      child.position.y = ud.baseY + Math.sin(elapsed * ud.bobSpeed) * ud.bobAmp;
    });
    
    // Connection lines — brighter at higher dwell levels
    if (this.showcaseLines && this.showcaseLines.material) {
      this.showcaseLines.material.opacity = 0.1 + level * 0.08 + Math.sin(elapsed * 0.8) * 0.05;
    }
  }

  updateSignatureObject(elapsed) {
    if (!this.signatureGroup) return;
    
    // THE REFUSAL — object freezes in spacetime
    if (this.refusalActive) {
      this.frozenTimeOffset += (elapsed - (this._lastElapsed || elapsed));
      this._lastElapsed = elapsed;
      return;
    }
    this._lastElapsed = elapsed;
    const adjustedTime = elapsed - this.frozenTimeOffset;
    
    // ═══ REQ 6: EMOTIONAL PHASE DEFORMS THE SIGNATURE ═══
    // Confrontation: aggressive, high-frequency deformation
    // Transformation: harmonic, synchronized, low-frequency
    const emoBias = this.signatureEmotionalBias;
    
    this.signatureRings.forEach((ring, index) => {
      const config = ring.config;
      const material = ring.material;
      const mesh = ring.mesh;
      
      material.uniforms.uTime.value = adjustedTime;
      // Emotional phase shifts deformation bias
      material.uniforms.uDeformBias.value = this.deformationBias + emoBias * 0.5;
      
      // ═══ REQ 1: Rotation speed responds to user intent ═══
      const intentSpeed = config.speed * userIntent.timeScale;
      
      switch (config.rotationAxis) {
        case 'x': mesh.rotation.x = elapsed * intentSpeed; break;
        case 'y': mesh.rotation.y = elapsed * intentSpeed; break;
        case 'z': mesh.rotation.z = elapsed * intentSpeed; break;
      }
      
      // Secondary rotation + emotional tremor during confrontation
      const emotionTremor = emoBias > 0.3 ? Math.sin(elapsed * 8) * emoBias * 0.02 : 0;
      mesh.rotation.x += Math.sin(elapsed * 0.2 + index) * 0.01 + emotionTremor;
      mesh.rotation.z += Math.cos(elapsed * 0.15 + index) * 0.01 + emotionTremor;
    });
    
    this.signatureGroup.rotation.y = elapsed * 0.05 * userIntent.timeScale;
  }

  updateCamera(elapsed) {
    const camera = this.sceneManager.getCamera();
    
    // ═══ REQ 1: CAMERA LERP RESPONDS TO USER INTENT ═══
    // Rushing = snappy follow. Lingering = dreamy drift.
    const baseLerp = 0.03 + this.scarOffsets.cameraLerp;
    const intentLerp = baseLerp + userIntent.rushFactor * 0.04 - userIntent.lingerFactor * 0.015;
    this.intentCameraLerp += (Math.max(0.01, intentLerp) - this.intentCameraLerp) * 0.05;
    
    this.cameraState.currentX += (this.mouseTarget.x * 20 - this.cameraState.currentX) * this.intentCameraLerp;
    this.cameraState.currentY += (this.mouseTarget.y * 10 - this.cameraState.currentY) * this.intentCameraLerp;
    
    camera.position.x = this.cameraState.currentX + this.ghostCameraDrift;
    camera.position.y = 20 + this.cameraState.currentY;
    
    // ═══ REQ 2: IDLE DRIFT — camera breathes when user lingers ═══
    const linger = userIntent.lingerFactor;
    if (linger > 0.3) {
      camera.position.x += Math.sin(elapsed * 0.13) * 1.5 * linger;
      camera.position.y += Math.cos(elapsed * 0.09) * 0.8 * linger;
    }
    
    camera.lookAt(0, 0, 0);
    
    // Roll modulated by emotional phase + hesitation
    const emotionRoll = this.signatureEmotionalBias * 0.02;
    const hesitationRoll = userIntent.hesitationFactor * Math.sin(elapsed * 2.5) * 0.02;
    camera.rotation.z = Math.sin(elapsed * 0.35) * 0.03 + this.scarOffsets.roll + emotionRoll + hesitationRoll;
  }

  updateFog(elapsed) {
    const scene = this.sceneManager.getScene();
    
    // FOG THAT LIES — breathes out of sync
    // ═══ REQ 6: Emotional phase shifts fog density ═══
    // Uncertainty = denser. Confrontation = thickest. Transformation = clearing.
    const phase = userIntent.emotionalPhaseIndex;
    const emotionFog = phase === 1 ? 0.01 : phase === 2 ? 0.02 : phase >= 3 ? -0.005 : 0;
    
    if (scene.fog) {
      scene.fog.density = 0.04 + this.scarOffsets.fog + this.ghostFogOffset + emotionFog 
        + Math.sin(elapsed * 0.6) * 0.01;
    }
  }

  updateLighting(elapsed) {
    // Key light circles
    const keyAngle = elapsed * 0.2;
    this.keyLight.position.x = Math.cos(keyAngle) * 60;
    this.keyLight.position.z = Math.sin(keyAngle) * 60;
    
    // Rim light pulses
    this.rimLight.intensity = 1.5 + Math.sin(elapsed) * 0.5;
    
    // Ground glow reacts to deformation
    this.groundGlow.intensity = 0.5 + Math.abs(this.deformationBias) * 1.5;
  }

  // ═══════════════════════════════════════════════════════════
  // THE REFUSAL — resolution
  // 1.5 seconds of nothing. Then: violence.
  // ═══════════════════════════════════════════════════════════

  updateRefusal() {
    if (!this.refusalActive || !this.pendingService) return;
    
    const refusalElapsed = (performance.now() / 1000) - this.refusalStart;
    if (refusalElapsed < 1.5) return;
    
    this.refusalActive = false;
    const pending = this.pendingService;
    this.pendingService = null;
    
    // Slam to 3x the target bias, with minimum violence of ±2.0
    // If bias is 0 (stabilization), slam to -2.0 instead — silence must also break violently
    const slamBias = Math.abs(pending.bias) < 0.1 ? -2.0 : pending.bias * 3;
    
    // Post-processing violent spike during refusal slam
    if (this.postProcessing) this.postProcessing.spike(2.5, 0.6);
    
    gsap.to(this, {
      deformationBias: slamBias,
      duration: 0.2,
      ease: 'power4.in',
      onComplete: () => {
        gsap.to(this, {
          deformationBias: pending.bias,
          duration: 1.8,
          ease: 'elastic.out(1, 0.3)'
        });
      }
    });
    
    // Colors flash white, then settle
    this.ringMaterials.forEach(mat => {
      gsap.to(mat.uniforms.uColor1.value, {
        r: 1, g: 1, b: 1,
        duration: 0.15,
        onComplete: () => {
          gsap.to(mat.uniforms.uColor1.value, {
            r: new THREE.Color(pending.color.c1).r,
            g: new THREE.Color(pending.color.c1).g,
            b: new THREE.Color(pending.color.c1).b,
            duration: 1.2
          });
        }
      });
      gsap.to(mat.uniforms.uColor2.value, {
        r: 1, g: 1, b: 1,
        duration: 0.15,
        onComplete: () => {
          gsap.to(mat.uniforms.uColor2.value, {
            r: new THREE.Color(pending.color.c2).r,
            g: new THREE.Color(pending.color.c2).g,
            b: new THREE.Color(pending.color.c2).b,
            duration: 1.2
          });
        }
      });
    });
  }

  // ═════════════════════════════════════════════════════════════
  // THE GHOST — silent second fracture
  // No announcement. No drama. No recovery. No proof.
  //
  // Between 8-25 seconds after arriving on this page,
  // a compound micro-event fires. Each piece is too small
  // to identify alone. Together, they create a moment of
  // wrongness that the user will question was real.
  //
  // If they question it, you succeeded.
  // ═════════════════════════════════════════════════════════════

  updateGhost(elapsed) {
    if (this.ghostTriggered) return;
    if (elapsed < this.ghostTime) return;
    
    this.ghostTriggered = true;
    
    // Ghost gets a subtle PP spike — distortion without drama
    if (this.postProcessing) this.postProcessing.spike(1.0, 0.3);
    
    // 1. Camera drifts 1.5 units left. Permanently.
    //    The framing is now asymmetric. It will never be explained.
    //    It will never return.
    gsap.to(this, {
      ghostCameraDrift: -1.5,
      duration: 0.6,
      ease: 'none'
    });
    
    // 2. Fog pocket — clears to near-nothing for 0.25s
    //    The user sees clearly. Then it's taken away.
    //    But the fog that returns is 0.003 denser than before.
    //    The world is permanently darker after the moment of clarity.
    gsap.to(this, {
      ghostFogOffset: -0.032,
      duration: 0.25,
      ease: 'none',
      onComplete: () => {
        gsap.to(this, {
          ghostFogOffset: 0.003,
          duration: 0.4,
          ease: 'none'
        });
      }
    });
    
    // 3. Signature object tilts 2.5° on X axis. Permanently.
    //    The impossible object was level. Now it leans.
    //    There is no reason. There will never be a reason.
    if (this.signatureGroup) {
      gsap.to(this.signatureGroup.rotation, {
        x: 0.044,
        duration: 0.8,
        ease: 'none'
      });
    }
  }

  animateIn() {
    const camera = this.sceneManager.getCamera();
    camera.position.set(0, 50, 120);
    camera.lookAt(0, 0, 0);
    
    gsap.to(camera.position, {
      y: 20,
      z: 80,
      duration: 2,
      ease: 'power2.out'
    });
    
    // Rings scale in
    this.signatureRings.forEach((ring, i) => {
      ring.mesh.scale.setScalar(0);
      gsap.to(ring.mesh.scale, {
        x: 1,
        y: 1,
        z: 1,
        duration: 1.5,
        delay: 0.2 * i,
        ease: 'elastic.out(1, 0.5)'
      });
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
    if (this.clickHandler) {
      window.removeEventListener('click', this.clickHandler);
    }
    if (this.scrollHandler) {
      window.removeEventListener('scroll', this.scrollHandler);
    }
    if (this.scarListener) {
      window.removeEventListener('physicsScar', this.scarListener);
    }
    // Kill any active instability tweens
    gsap.killTweensOf(this);
    if (this.signatureGroup) gsap.killTweensOf(this.signatureGroup.rotation);
    // Reset instability state
    this.refusalActive = false;
    this.pendingService = null;
    this.ghostTriggered = false;
    this.ghostCameraDrift = 0;
    this.ghostFogOffset = 0;
    if (this.lighting) this.lighting.dispose();
    if (this.postProcessing) this.postProcessing.dispose();
    if (this.sceneManager) {
      this.sceneManager.clearRenderOverride();
      this.sceneManager.dispose();
    }
  }

  dispose() {
    this.destroy();
  }
}
