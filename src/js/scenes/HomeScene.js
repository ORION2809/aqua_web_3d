/**
 * Aurora Aqua - Home Scene
 * PRODUCTION DOCTRINE BUILD
 * 
 * ACT 1: DOLPHIN APEX → DESCENT → SPLASH (0-7.5s)
 * ACT 2: DEEP UNDERWATER EXPLORATION (scroll-driven)
 * 
 * You are not arriving at the website — you are entering a world.
 * The intro is seen through a dolphin’s eyes: apex, freefall, impact.
 */

import * as THREE from 'three';
import gsap from 'gsap';
import { isMobile, getPerformanceTier } from '../utils/device.js';
import { PostProcessing } from '../three/PostProcessing.js';
import { userIntent } from '../utils/UserIntent.js';

export class HomeScene {
  constructor(container) {
    this.container = container;
    this.performanceTier = getPerformanceTier();
    this.isMobile = isMobile();
    
    // Timeline state
    this.startTime = 0;
    this.phase = 'waiting';
    this.hasBreached = false;
    this.isAnimating = false;
    this.animationId = null;
    this.act2Started = false;
    
    // ACT 2 state
    this.maxScroll = 2000;
    this.currentScrollY = 0;
    
    // THE FRACTURE — designed instability (once per session, different position each visit)
    this.fractureActive = false;
    this.fractureStart = 0;
    this.fractureThreshold = 0.3 + ((Date.now() % 1000) / 2500);
    this.fractureTriggered = false;
    try { this.fractureTriggered = sessionStorage.getItem('aurora_fractured') === 'true'; } catch(e) {}
    
    // THE SCAR — permanent physics corruption after fracture
    // Values never fully return. The user cannot name what's wrong.
    // They just know the world feels heavier.
    this.scarActive = false;
    this.scarOffsets = { roll: 0, fog: 0, compression: 0 };
    try {
      if (sessionStorage.getItem('aurora_scarred') === 'true') {
        this.scarActive = true;
        this.scarOffsets = { roll: 0.018, fog: 0.008, compression: 0.03 };
      }
    } catch(e) {}
    
    // Scene components
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.clock = new THREE.Clock();
    
    // Water surface
    this.waterSurface = null;
    this.waterMaterial = null;
    
    // Particles
    this.particles = null;
    this.lightShafts = [];
    this.depthRings = [];
    this.particleVelocities = [];
    
    // Depth objects for compression
    this.depthObjects = [];
    
    // Post-processing
    this.postProcessing = null;
    
    // Depth zone state (scroll-driven atmosphere)
    this.currentZone = 'surface';
    this.depthZoneThresholds = {
      surface:  0.0,
      shallow:  0.15,
      twilight: 0.35,
      midnight: 0.6,
      abyss:    0.85
    };
    
    // Zone-specific lighting palettes (fog + ambient + exposure + background gradient)
    this.zoneLighting = {
      surface:  { fog: 0x0a5a8a, fogDensity: 0.012, ambient: 0x0a6a9e, ambientI: 0.6, exposure: 0.8,
                  bgTop: 0x041e42, bgMid: 0x0a3d62, bgBottom: 0x0891b2 },
      shallow:  { fog: 0x042e5a, fogDensity: 0.035, ambient: 0x0a4a6e, ambientI: 0.5, exposure: 0.65,
                  bgTop: 0x031535, bgMid: 0x062e52, bgBottom: 0x06708a },
      twilight: { fog: 0x021838, fogDensity: 0.06,  ambient: 0x06305a, ambientI: 0.35, exposure: 0.5,
                  bgTop: 0x020e28, bgMid: 0x041e42, bgBottom: 0x04506e },
      midnight: { fog: 0x010e22, fogDensity: 0.085, ambient: 0x041e42, ambientI: 0.2, exposure: 0.35,
                  bgTop: 0x010818, bgMid: 0x021230, bgBottom: 0x023050 },
      abyss:    { fog: 0x000812, fogDensity: 0.12,  ambient: 0x020e1e, ambientI: 0.1, exposure: 0.2,
                  bgTop: 0x000408, bgMid: 0x000a14, bgBottom: 0x011828 },
    };
    
    // ═══ IDEA 1: CAMERA PATH CURVE ═══
    // Instead of linear Y movement, camera travels through a 3D spline
    // Each section of the curve is a spatial zone, not a DOM panel
    this.cameraPath = null;
    this.cameraLookPath = null;
    
    // ═══ IDEA 3: LIVING CREATURES ═══
    this.creatures = [];
    this.lightBeams = [];
    
    // ═══ DATA VISUALIZATION GLYPHS ═══
    // Holographic depth markers and metrics as 3D objects
    this.dataGlyphs = [];
    
    // Click ripple
    this.clickHandler = null;
    
    // ═══ REQ 2: FUZZY SPATIAL WORLD ═══
    // Zone boundaries blend, not snap. Camera drifts when idle.
    this.zoneBlend = 0;           // 0–1 blend between current zone and next
    this.idleDrift = new THREE.Vector3(); // autonomous camera drift when user is still
    this.pendingZone = null;      // zone waiting behind the gate
    
    // ═══ REQ 3: CREATURE AGENCY ═══
    // Fish have moods, not scripts
    this.creatureMood = 'neutral'; // neutral | curious | territorial | guiding
    this.guideFish = null;         // unlocked guide fish reference
    
    // ═══ REQ 4: PERCEPTION SHIFT ═══
    this.perceptionShiftPlayed = false;
    this.invertedGravityFactor = 0;
    
    // ═══ REQ 5: INTERACTION STATES ═══
    this.glyphInteractionLevel = 0; // 0=passive, 1=revealed, 2=expanded, 3=resonating
    this.beamEngagementZone = null; // which zone's beams are user-engaged
    
    // ═══ REQ 6: EMOTIONAL PROGRESSION ═══
    // Lighting/motion/interaction parameters driven by emotional phase
    this.emotionLighting = { intensity: 0.6, colorShift: 0, motionScale: 1, interactionResistance: 0 };
    
    this.init();
  }

  init() {
    this.createRenderer();
    this.createScene();
    this.createCamera();
    this.createWaterSurface();
    this.createLighting();
    this.createSunsetElements();
    this.createDepthObjects();
    
    this.prepareParticles();
    this.prepareDepthRings();
    this.prepareLightShafts();
    
    // Post-processing pipeline
    this.postProcessing = new PostProcessing(this.renderer, this.scene, this.camera);
    this.postProcessing.setZone('surface');
    
    // Camera path through space (IDEA 1)
    this.createCameraPath();
    
    // Living creatures (IDEA 3)
    this.createCreatures();
    this.createLightBeams();
    
    // Data visualization glyphs (concrete themes)
    this.createDataGlyphs();
    
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
    
    this.setupResize();
    this.setupScrollListener();
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
    this.scene.fog = null;
  }

  createCamera() {
    // Camera optics per spec:
    // Sensor: 36mm, Focal length: 35mm → FOV ≈ 54.4°
    // Aperture: f/8, Focus distance: 30m
    const sensorWidth = 36; // mm
    const focalLength = 35; // mm
    const fov = 2 * Math.atan(sensorWidth / (2 * focalLength)) * (180 / Math.PI); // ~54.4°
    
    this.camera = new THREE.PerspectiveCamera(
      fov,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    );
    // FIRST FRAME: Eye-level just above the ocean surface.
    // Camera at y=1.8 — the viewer is right at the waterline,
    // looking across an infinite ocean toward a sunset horizon.
    // 54° FOV from 35mm lens — natural perspective, no distortion.
    this.camera.position.set(0, 1.8, 6.5);
    this.camera.lookAt(new THREE.Vector3(0, 0.5, -100));
  }

  createWaterSurface() {
    const geometry = new THREE.PlaneGeometry(2000, 2000, 512, 512);
    
    this.waterMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPhase: { value: 0 },
        uRupture: { value: 0 },
        uSunsetBlend: { value: 1.0 },
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
        varying vec3 vNormal;
        
        // Gerstner wave — physically correct surface displacement
        vec3 gerstnerWave(vec2 p, vec2 dir, float steepness, float wavelength, float speed) {
          float k = 6.28318 / wavelength;
          float c = speed / k;
          float f = k * (dot(dir, p) - c * uTime);
          float a = steepness / k;
          return vec3(
            dir.x * a * cos(f),
            a * sin(f),
            dir.y * a * cos(f)
          );
        }
        
        void main() {
          vUv = uv;
          vec3 pos = position;
          
          // ═══ PHYSICALLY-BASED OCEAN WAVES (per spec) ═══
          
          // Primary swell — amplitude 0.45m, wavelength 14m, direction 250°
          vec2 dir1 = normalize(vec2(-0.94, -0.34)); // 250 degrees
          vec3 w1 = gerstnerWave(pos.xy, dir1, 0.35, 14.0, 1.1);
          
          // Secondary wave — amplitude 0.12m, wavelength 4.5m, direction 120°
          vec2 dir2 = normalize(vec2(-0.5, 0.87));   // 120 degrees
          vec3 w2 = gerstnerWave(pos.xy, dir2, 0.18, 4.5, 0.6);
          
          // Additional ocean swells for depth
          vec3 w3 = gerstnerWave(pos.xy, normalize(vec2(0.7, -0.7)), 0.12, 22.0, 0.9);
          vec3 w4 = gerstnerWave(pos.xy, normalize(vec2(-0.3, 0.95)), 0.08, 8.0, 0.5);
          vec3 w5 = gerstnerWave(pos.xy, normalize(vec2(0.9, 0.4)), 0.06, 3.2, 0.4);
          
          // Micro-ripple normal detail (spec: strength 0.35, scale 0.08)
          float ripple = sin(pos.x * 0.8 + pos.y * 0.6 + uTime * 2.2) * 0.04;
          ripple += sin(pos.x * 1.2 - pos.y * 0.9 + uTime * 2.8) * 0.03;
          ripple += sin(pos.x * 2.0 + pos.y * 1.5 + uTime * 3.5) * 0.02;
          
          // Combine Gerstner waves
          vec3 totalWave = w1 + w2 + w3 + w4 + w5;
          pos.x += totalWave.x;
          pos.y += totalWave.z;
          float oceanHeight = totalWave.y + ripple;
          
          // Tension waves amplify with phase (descent agitation)
          float tension = sin(pos.x * 0.3 + uTime * 1.5) * 0.8 * uPhase;
          tension += sin(pos.y * 0.25 + uTime * 1.2) * 0.6 * uPhase;
          tension += sin(pos.x * 0.6 + pos.y * 0.4 + uTime * 2.5) * 0.4 * uPhase;
          
          pos.z = oceanHeight + tension;
          pos.z -= uRupture * 5.0;
          
          vElevation = pos.z;
          vWorldPos = (modelMatrix * vec4(pos, 1.0)).xyz;
          
          // ═══ OCEAN NORMALS (per spec) ═══
          // slope_variance: 0.22, directional_bias: 0.65, sun_alignment_boost: 1.3
          float slopeVar = 0.22;
          float dirBias = 0.65;
          float sunBoost = 1.3;
          
          // Compute analytical normal from wave derivatives
          float eps = 0.5;
          // Partial derivatives for normal (finite difference approx)
          float dzdx = (
            sin((pos.x + eps) * 0.5 + uTime) - sin((pos.x - eps) * 0.5 + uTime)
          ) * slopeVar;
          float dzdy = (
            cos((pos.y + eps) * 0.4 + uTime * 0.7) - cos((pos.y - eps) * 0.4 + uTime * 0.7)
          ) * slopeVar;
          
          // Add micro-normal detail for roughness
          dzdx += sin(pos.x * 2.0 + pos.y * 1.5 + uTime * 3.0) * slopeVar * 0.4;
          dzdy += cos(pos.x * 1.5 - pos.y * 2.0 + uTime * 2.5) * slopeVar * 0.4;
          
          // Directional bias — align normals toward sun direction (250°)
          vec2 sunDir = normalize(vec2(-0.94, -0.34));
          float alignment = dot(normalize(vec2(dzdx, dzdy) + 0.001), sunDir);
          float biasScale = 1.0 + (alignment * 0.5 + 0.5) * dirBias * (sunBoost - 1.0);
          dzdx *= biasScale;
          dzdy *= biasScale;
          
          vec3 tangent = normalize(vec3(1.0, 0.0, dzdx));
          vec3 bitangent = normalize(vec3(0.0, 1.0, dzdy));
          vNormal = normalize(cross(tangent, bitangent));
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uPhase;
        uniform float uSunsetBlend;
        uniform vec3 uColorDeep;
        uniform vec3 uColorSurface;
        uniform vec3 uColorHighlight;
        
        varying vec2 vUv;
        varying float vElevation;
        varying vec3 vWorldPos;
        varying vec3 vNormal;
        
        void main() {
          float distFromCenter = length(vUv - 0.5);
          
          // ═══ UNDERWATER BASE COLOR ═══
          vec3 underwaterColor = mix(uColorSurface, uColorDeep, distFromCenter * 1.5);
          float crest = smoothstep(0.02, 0.2, vElevation);
          underwaterColor = mix(underwaterColor, uColorHighlight, crest * 0.15);
          
          // ═══ PHYSICALLY-BASED OCEAN COLOR (per spec) ═══
          // Base color: #243a5e with absorption coefficients
          vec3 oceanBase = vec3(0.14, 0.227, 0.369); // #243a5e
          vec3 oceanDeep = vec3(0.04, 0.09, 0.18);    // absorbed deep water
          vec3 oceanSky  = vec3(0.30, 0.38, 0.55);    // sky reflection in water
          
          // Depth-based absorption (red absorbed most, blue least)
          float depthFactor = smoothstep(0.0, 0.5, distFromCenter);
          vec3 absorbed = oceanBase;
          absorbed.r *= (1.0 - 0.35 * depthFactor); // red absorption 0.35
          absorbed.g *= (1.0 - 0.18 * depthFactor); // green absorption 0.18
          absorbed.b *= (1.0 - 0.05 * depthFactor); // blue absorption 0.05
          
          vec3 sunsetColor = absorbed;
          
          // ═══ FRESNEL REFLECTANCE (spec: 0.92) ═══
          // At grazing angles, water strongly reflects the sky
          vec3 viewDir = normalize(vec3(0.0, 1.0, 0.3)); // approximate view
          float NdotV = abs(dot(vNormal, viewDir));
          float fresnel = pow(1.0 - NdotV, 5.0);
          fresnel = mix(0.04, 0.92, fresnel); // F0=0.04 (water), max per spec
          
          // Sky reflection color (warm near horizon, cooler higher)
          vec3 skyRefl = mix(vec3(0.6, 0.35, 0.2), oceanSky, NdotV);
          sunsetColor = mix(sunsetColor, skyRefl, fresnel * 0.6);
          
          // Wave crests catch subtle sky light
          vec3 crestHighlight = mix(oceanSky, vec3(0.5, 0.4, 0.35), 0.3);
          sunsetColor = mix(sunsetColor, crestHighlight, crest * 0.2);
          
          // ═══ SPECULAR SUN REFLECTION (per spec) ═══
          // Type: specular_stretch, width 2.8m, length 120m
          // Narrow elongated golden strip — #ffb066
          vec3 sunReflColor = vec3(1.0, 0.69, 0.40); // #ffb066
          
          // Compute specular reflection path
          float sunDirX = vUv.x - 0.5;
          float sunDirZ = 1.0 - vUv.y;
          
          // Width 2.8m equivalent — very narrow X spread
          float specX = exp(-sunDirX * sunDirX * 80.0);
          // Length 120m — stretches far toward horizon
          float specZ = smoothstep(0.05, 0.95, sunDirZ);
          // Combined specular path
          float specPath = specX * specZ;
          
          // Break up with micro-shimmer (roughness 0.18)
          float sh1 = sin(vWorldPos.x * 2.0 + uTime * 2.5) * 0.5 + 0.5;
          float sh2 = sin(vWorldPos.y * 1.4 + uTime * 1.8) * 0.5 + 0.5;
          float sh3 = sin(vWorldPos.x * 4.0 - uTime * 3.5) * 0.5 + 0.5;
          float microShimmer = sh1 * sh2 * 0.5 + sh3 * 0.5;
          specPath *= (0.25 + microShimmer * 0.75);
          
          // Bright core of specular reflection
          float specCore = exp(-sunDirX * sunDirX * 300.0) * smoothstep(0.3, 0.7, sunDirZ);
          specCore *= (0.4 + sh1 * 0.6);
          
          // Apply sun reflection — intensity 1.0 per spec
          sunsetColor = mix(sunsetColor, sunReflColor, specPath * 0.5);
          sunsetColor += sunReflColor * specCore * 0.4;
          
          // ═══ FOAM / WHITECAPS ═══
          float foamMask = smoothstep(0.15, 0.35, vElevation);
          float foam1 = sin(vWorldPos.x * 0.6 + vWorldPos.y * 0.4 + uTime * 0.8);
          float foam2 = sin(vWorldPos.x * 1.1 - vWorldPos.y * 0.7 + uTime * 1.2);
          float foamPattern = smoothstep(0.3, 0.9, foam1 * foam2 + 0.5);
          float foam = foamMask * foamPattern;
          sunsetColor = mix(sunsetColor, vec3(0.85, 0.88, 0.92), foam * 0.25);
          
          // ═══ SCATTERING (spec: intensity 0.6, anisotropy 0.75) ═══
          // Forward scattering near the sun path adds sub-surface glow
          float scatter = specZ * 0.6 * pow(max(0.0, specX), 0.75);
          sunsetColor += vec3(0.1, 0.15, 0.08) * scatter;
          
          // ═══ BLEND SUNSET ↔ UNDERWATER ═══
          vec3 color = mix(underwaterColor, sunsetColor, uSunsetBlend);
          
          // Standard fresnel for underwater mode
          color += uColorHighlight * fresnel * 0.08 * (1.0 - uSunsetBlend);
          
          // Pulse during descent
          float pulse = sin(uTime * 3.7) * 0.5 + 0.5;
          color *= 1.0 + pulse * 0.08 * uPhase;
          
          // Alpha — more opaque at eye-level for dense water feel
          float alpha = mix(0.94, 0.99, uSunsetBlend);
          
          gl_FragColor = vec4(color, alpha);
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
    const ambient = new THREE.AmbientLight(0x0a4a6e, 0.4);
    this.scene.add(ambient);
    this.ambientLight = ambient;
    
    this.mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
    this.mainLight.position.set(50, 100, 50);
    this.scene.add(this.mainLight);
    
    // Warm sunset light — 4200K, low elevation (2.5°), azimuth 270° (due west = -Z)
    this.sunsetLight = new THREE.DirectionalLight(0xffa54f, 1.4);
    this.sunsetLight.position.set(0, 4, -200);
    this.scene.add(this.sunsetLight);
    
    this.underwaterLight = new THREE.PointLight(0x22d3ee, 0, 200);
    this.underwaterLight.position.set(0, -50, 0);
    this.scene.add(this.underwaterLight);
  }

  // Sun, horizon glow, atmospheric light rays — above-water beauty
  createSunsetElements() {
    // Sun orb — positioned at 2.5° elevation, 4200K warm color
    // From eye-level (y=1.8), the sun appears just kissing the horizon
    const sunGeo = new THREE.SphereGeometry(8, 64, 64);
    const sunMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
      },
      vertexShader: `
        varying vec3 vWorldPos;
        varying vec3 vNormal;
        void main() {
          vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec3 vWorldPos;
        varying vec3 vNormal;
        void main() {
          // Clip below water level — half-submerged sun
          if (vWorldPos.y < -0.5) discard;
          // Soft fade near water line (edge_softness: 0.18)
          float waterEdge = smoothstep(-0.5, 2.5, vWorldPos.y);
          
          // Sun disk — 4200K color temperature
          // Core: warm white, Edge: deep amber-orange
          float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 1.8);
          vec3 core = vec3(1.0, 0.88, 0.72);  // 4200K warm white
          vec3 edge = vec3(1.0, 0.52, 0.18);  // deep amber
          vec3 color = mix(core, edge, fresnel);
          // Very subtle pulsation
          float pulse = sin(uTime * 0.3) * 0.02 + 1.0;
          color *= pulse;
          float alpha = (1.0 - fresnel * 0.2) * waterEdge;
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    
    // Sun at ~2.5° elevation from camera at y=1.8
    // At distance 300, elevation of 2.5° = ~13 units above horizon + camera height
    this.sunMesh = new THREE.Mesh(sunGeo, sunMat);
    this.sunMesh.position.set(0, 3.0, -300);
    this.scene.add(this.sunMesh);
    
    // Horizon glow plane — a large, soft emissive disc at the horizon
    const glowGeo = new THREE.PlaneGeometry(600, 120, 1, 1);
    const glowMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
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
        varying vec2 vUv;
        void main() {
          float dist = length(vUv - vec2(0.5));
          float glow = exp(-dist * dist * 4.0) * 0.6;
          vec3 color = mix(vec3(1.0, 0.5, 0.15), vec3(1.0, 0.85, 0.4), glow);
          float shimmer = sin(vUv.x * 20.0 + uTime * 1.5) * 0.03 + 1.0;
          gl_FragColor = vec4(color * shimmer, glow * 0.7);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    
    this.horizonGlow = new THREE.Mesh(glowGeo, glowMat);
    this.horizonGlow.position.set(0, 2.0, -290);
    this.scene.add(this.horizonGlow);
    
    // Atmospheric light rays — volumetric cones from sun toward camera
    this.sunRays = [];
    for (let i = 0; i < 5; i++) {
      const rayGeo = new THREE.CylinderGeometry(0.5, 15 + i * 6, 300, 8, 1, true);
      const rayMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(1.0, 0.7 + i * 0.05, 0.3),
        transparent: true,
        opacity: 0.04 - i * 0.005,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const ray = new THREE.Mesh(rayGeo, rayMat);
      ray.position.set((i - 2) * 25, 5, -200);
      ray.rotation.x = Math.PI / 2;
      ray.rotation.z = (i - 2) * 0.08;
      this.sunRays.push(ray);
      this.scene.add(ray);
    }
    
    // Store all sunset elements for fade-out during submersion
    this.sunsetElements = [this.sunMesh, this.horizonGlow, ...this.sunRays];
  }

  // Depth objects for ACT 2 compression effect
  createDepthObjects() {
    const count = this.performanceTier === 'high' ? 20 : 10;
    
    // Mix of organic geometries — no cubes, no perfect shapes
    const geoTypes = [
      () => new THREE.SphereGeometry(3 + Math.random() * 4, 12, 10),
      () => new THREE.DodecahedronGeometry(3 + Math.random() * 4, 1),
      () => new THREE.IcosahedronGeometry(3 + Math.random() * 4, 1),
      () => new THREE.OctahedronGeometry(3 + Math.random() * 5, 2),
    ];
    
    for (let i = 0; i < count; i++) {
      const geo = geoTypes[i % geoTypes.length]();
      const mat = new THREE.MeshPhysicalMaterial({
        color: 0x0891b2,
        emissive: 0x041e42,
        emissiveIntensity: 0.3,
        metalness: 0.6,
        roughness: 0.4,
        transparent: true,
        opacity: 0.7
      });
      
      const obj = new THREE.Mesh(geo, mat);
      obj.position.set(
        (Math.random() - 0.5) * 150,
        -50 - Math.random() * 200,
        (Math.random() - 0.5) * 150
      );
      // Random non-uniform scale for organic feel
      obj.scale.set(
        0.7 + Math.random() * 0.6,
        0.7 + Math.random() * 0.6,
        0.7 + Math.random() * 0.6
      );
      obj.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      obj.userData.originalScale = obj.scale.clone();
      obj.userData.originalY = obj.position.y;
      
      this.depthObjects.push(obj);
      this.scene.add(obj);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // IDEA 1: CAMERA PATH CURVE
  // The user doesn't scroll down a page — they travel through space.
  // ═══════════════════════════════════════════════════════════

  createCameraPath() {
    const waypoints = [
      new THREE.Vector3(0, -40, 60),       // ZONE 1: Shallow entry
      new THREE.Vector3(20, -80, 40),      // ZONE 2: Drift right, descend
      new THREE.Vector3(10, -120, 20),     // ZONE 3: Twilight — forward into deep
      new THREE.Vector3(-15, -170, -10),   // ZONE 4: Midnight — drift left
      new THREE.Vector3(-5, -220, -40),    // ZONE 5: Abyss
      new THREE.Vector3(0, -250, -60),     // ZONE 6: Final depth
    ];
    
    this.cameraPath = new THREE.CatmullRomCurve3(waypoints, false, 'catmullrom', 0.5);
    
    const lookTargets = [
      new THREE.Vector3(0, -50, 0),
      new THREE.Vector3(0, -100, -20),
      new THREE.Vector3(0, -140, -40),
      new THREE.Vector3(0, -190, -60),
      new THREE.Vector3(0, -240, -80),
      new THREE.Vector3(0, -270, -100),
    ];
    
    this.cameraLookPath = new THREE.CatmullRomCurve3(lookTargets, false, 'catmullrom', 0.5);
  }

  // ═══════════════════════════════════════════════════════════
  // IDEA 3: LIVING CREATURES
  // Fish school, migrate, and flee from the camera.
  // ═══════════════════════════════════════════════════════════

  createCreatures() {
    const fishCount = this.performanceTier === 'high' ? 40 : 20;
    
    for (let i = 0; i < fishCount; i++) {
      const bodyGeo = new THREE.SphereGeometry(1, 8, 6);
      bodyGeo.scale(2.5, 0.8, 0.6);
      
      const isDeep = Math.random() > 0.5;
      const fishColor = isDeep ? 0x22d3ee : 0x0891b2;
      const emissiveColor = isDeep ? 0x0891b2 : 0x041e42;
      
      const fishMat = new THREE.MeshPhysicalMaterial({
        color: fishColor,
        emissive: emissiveColor,
        emissiveIntensity: 0.4 + Math.random() * 0.4,
        metalness: 0.3,
        roughness: 0.6,
        transparent: true,
        opacity: 0.8
      });
      
      const fish = new THREE.Mesh(bodyGeo, fishMat);
      
      // Position in schools (clusters)
      const schoolIndex = Math.floor(i / 8);
      const schoolCenter = new THREE.Vector3(
        (Math.random() - 0.5) * 120,
        -60 - schoolIndex * 50 - Math.random() * 30,
        (Math.random() - 0.5) * 120
      );
      
      fish.position.set(
        schoolCenter.x + (Math.random() - 0.5) * 20,
        schoolCenter.y + (Math.random() - 0.5) * 10,
        schoolCenter.z + (Math.random() - 0.5) * 20
      );
      
      fish.scale.setScalar(0.5 + Math.random() * 0.8);
      
      fish.userData = {
        schoolCenter: schoolCenter.clone(),
        speed: 0.3 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2,
        orbitRadius: 8 + Math.random() * 15,
        verticalAmplitude: 2 + Math.random() * 5,
        originalY: fish.position.y,
        fleeRadius: 25,
        fleeOffset: new THREE.Vector3(0, 0, 0),
      };
      
      this.creatures.push(fish);
      this.scene.add(fish);
    }
  }

  // Light beams that slice through water — narrative cues
  createLightBeams() {
    const beamCount = 6;
    
    for (let i = 0; i < beamCount; i++) {
      const height = 150 + Math.random() * 100;
      const topRadius = 1 + Math.random() * 2;
      const bottomRadius = 8 + Math.random() * 12;
      
      const beamGeo = new THREE.CylinderGeometry(topRadius, bottomRadius, height, 12, 1, true);
      const beamMat = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uColor: { value: new THREE.Color(0x22d3ee) },
          uIntensity: { value: 0.08 + Math.random() * 0.05 },
        },
        vertexShader: `
          varying vec2 vUv;
          varying float vWorldY;
          void main() {
            vUv = uv;
            vWorldY = (modelMatrix * vec4(position, 1.0)).y;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float uTime;
          uniform vec3 uColor;
          uniform float uIntensity;
          varying vec2 vUv;
          varying float vWorldY;
          void main() {
            float edgeFade = 1.0 - abs(vUv.x - 0.5) * 2.0;
            edgeFade = pow(edgeFade, 2.0);
            float vertFade = vUv.y;
            float shimmer = sin(vWorldY * 0.1 + uTime * 0.5) * 0.5 + 0.5;
            shimmer *= sin(vWorldY * 0.3 + uTime * 0.8) * 0.5 + 0.5;
            float alpha = edgeFade * vertFade * uIntensity * (0.6 + shimmer * 0.4);
            float caustic = sin(vWorldY * 0.05 + uTime * 0.3) * sin(vUv.x * 8.0 + uTime * 0.5);
            caustic = caustic * 0.5 + 0.5;
            vec3 color = uColor * (1.0 + caustic * 0.3);
            gl_FragColor = vec4(color, alpha);
          }
        `,
        transparent: true,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.position.set(
        (Math.random() - 0.5) * 120,
        20,
        (Math.random() - 0.5) * 100 - 30
      );
      beam.rotation.set(
        (Math.random() - 0.5) * 0.3,
        Math.random() * Math.PI * 2,
        (Math.random() - 0.5) * 0.15
      );
      
      this.lightBeams.push(beam);
      this.scene.add(beam);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // DATA VISUALIZATION GLYPHS
  // Holographic depth markers, fish population circles,
  // environmental metrics floating at specific depths.
  // These are the "underwater data visualization" concrete theme.
  // ═══════════════════════════════════════════════════════════

  createDataGlyphs() {
    // Depth markers — holographic rings at zone boundaries
    const depthMarkers = [
      { y: -60,  label: '50m', zone: 'shallow',  color: 0x22d3ee },
      { y: -110, label: '100m', zone: 'twilight', color: 0x0891b2 },
      { y: -175, label: '200m', zone: 'midnight', color: 0x7c3aed },
      { y: -230, label: '500m', zone: 'abyss',   color: 0x1e40af },
    ];
    
    depthMarkers.forEach((marker, i) => {
      const group = new THREE.Group();
      
      // Main depth ring
      const ringGeo = new THREE.RingGeometry(18, 20, 64);
      const ringMat = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uColor: { value: new THREE.Color(marker.color) },
          uOpacity: { value: 0 },
        },
        vertexShader: `
          varying vec2 vUv;
          varying vec3 vPos;
          void main() {
            vUv = uv;
            vPos = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float uTime;
          uniform vec3 uColor;
          uniform float uOpacity;
          varying vec2 vUv;
          varying vec3 vPos;
          void main() {
            // Rotating dash pattern
            float angle = atan(vPos.y, vPos.x);
            float dash = sin(angle * 12.0 + uTime * 2.0) * 0.5 + 0.5;
            dash = step(0.3, dash);
            
            // Pulse
            float pulse = sin(uTime * 1.5 + float(${i}) * 0.8) * 0.3 + 0.7;
            
            float alpha = dash * pulse * uOpacity;
            gl_FragColor = vec4(uColor, alpha * 0.6);
          }
        `,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      group.add(ring);
      
      // Inner data ring (smaller, different rotation)
      const innerGeo = new THREE.RingGeometry(12, 13, 48);
      const innerMat = new THREE.MeshBasicMaterial({
        color: marker.color,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const innerRing = new THREE.Mesh(innerGeo, innerMat);
      innerRing.rotation.x = Math.PI / 2;
      group.add(innerRing);
      
      // Small metric spheres orbiting the depth marker
      const metricCount = 4 + Math.floor(Math.random() * 4);
      const metrics = [];
      for (let m = 0; m < metricCount; m++) {
        const mGeo = new THREE.SphereGeometry(0.4 + Math.random() * 0.3, 6, 4);
        const mMat = new THREE.MeshBasicMaterial({
          color: marker.color,
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const metric = new THREE.Mesh(mGeo, mMat);
        metric.userData = {
          angle: (m / metricCount) * Math.PI * 2,
          radius: 14 + Math.random() * 4,
          speed: 0.3 + Math.random() * 0.4,
        };
        metrics.push(metric);
        group.add(metric);
      }
      
      group.position.y = marker.y;
      
      group.userData = {
        ringMat,
        innerMat,
        innerRing,
        metrics,
        zone: marker.zone,
        baseY: marker.y,
        revealed: false,
      };
      
      this.dataGlyphs.push(group);
      this.scene.add(group);
    });
  }

  prepareParticles() {
    const count = this.performanceTier === 'high' ? 2000 : 
                  this.performanceTier === 'medium' ? 1000 : 500;
    
    const positions = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 200;
      positions[i * 3 + 1] = -Math.random() * 300 - 50;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 200;
      
      this.particleVelocities.push({
        y: 0.1 + Math.random() * 0.2,
        phase: Math.random() * Math.PI * 2
      });
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(0x67e8f9) },
        uOpacity: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
      },
      vertexShader: `
        uniform float uPixelRatio;
        void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = 1.5 * uPixelRatio * (300.0 / -mvPosition.z);
          gl_PointSize = clamp(gl_PointSize, 1.0, 30.0);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uOpacity;
        void main() {
          float dist = length(gl_PointCoord - 0.5);
          if (dist > 0.5) discard;
          float alpha = 1.0 - smoothstep(0.1, 0.5, dist);
          gl_FragColor = vec4(uColor, alpha * uOpacity);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    
    this.particles = new THREE.Points(geometry, material);
    this.scene.add(this.particles);
  }

  prepareLightShafts() {
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

  setupScrollListener() {
    this._prevScrollY = 0;
    this.scrollListener = () => {
      this._prevScrollY = this.currentScrollY;
      this.currentScrollY = window.scrollY;
    };
    window.addEventListener('scroll', this.scrollListener);
  }

  // ═══════════════════════════════════════════════════════════
  // ACT 1: THE DROWNING
  // ═══════════════════════════════════════════════════════════

  start() {
    if (this.isAnimating) return;
    
    this.isAnimating = true;
    this.startTime = this.clock.getElapsedTime();
    this.clock.start();
    
    this.lockReality();
    this.animate();
    this.runCinematicTimeline();
  }

  lockReality() {
    document.body.classList.add('lock-scroll', 'cinematic-mode');
    
    // ALL UI is fully invisible during the entire dolphin sequence.
    // No hero text. No tags. No CTAs. Nothing.
    // UI only appears AFTER submersion is complete.
    gsap.set('.hero__content', { opacity: 0, y: 30, visibility: 'hidden' });
    gsap.set('.hero__tag', { opacity: 0, visibility: 'hidden' });
    gsap.set('.hero__title-word', { opacity: 0, y: 100, visibility: 'hidden' });
    gsap.set('.hero__description', { opacity: 0, visibility: 'hidden' });
    gsap.set('.hero__cta', { opacity: 0, visibility: 'hidden' });
    gsap.set('.header', { opacity: 0, visibility: 'hidden' });
    
    window.dispatchEvent(new CustomEvent('lockScroll'));
  }

  runCinematicTimeline() {
    const tl = gsap.timeline();
    
    // ═══════════════════════════════════════════════════════════
    // ACT 1: SUNSET VISTA → DOLPHIN DESCENT → SPLASH → SINKING
    //
    // FRAME 1: A beautiful sunset over the ocean. Stunning.
    //   The user doesn't know this is a website yet.
    //
    // Then the camera arcs — like a dolphin cresting and diving.
    //   Down toward the surface. Faster. SPLASH.
    //   Underwater. Sinking. The world transforms.
    //
    // 0.0–2.5s  Sunset vista        Gorgeous above-water scene
    // 2.5–4.5s  Arc & tilt down     Camera sweeps from horizon to ocean
    // 4.5–5.8s  Acceleration        Terminal velocity toward the surface
    // 5.8–6.5s  Splash impact       Smash through, full distortion
    // 6.5–8.5s  Sinking             Visual weight, bubbles, warp, darkness
    // 8.5–9.5s  Settle & reentry    UI appears, scroll unlocks
    // ═══════════════════════════════════════════════════════════
    
    // ───────────────────────────────────────────────────────────
    // PHASE 1: SUNSET VISTA (0.0s → 2.5s)
    // The first frame is BEAUTY. Warm golden light. Ocean horizon.
    // Sun low in the sky. Light rays streaming toward camera.
    // Water shimmers below. Total peace. This is not a website.
    // ───────────────────────────────────────────────────────────
    
    tl.call(() => {
      this.phase = 'sunset';
      // Sky factor = 1 — full sunset gradient
      if (this.postProcessing) this.postProcessing.setSkyFactor(1.0);
      // Water reflects sunset
      if (this.waterMaterial) this.waterMaterial.uniforms.uSunsetBlend.value = 1.0;
      // Hide particles — we're above water
      if (this.particles && this.particles.material.uniforms) {
        this.particles.material.uniforms.uOpacity.value = 0;
      }
      // Canvas overtakes UI
      const canvas = document.querySelector('.canvas-container');
      if (canvas) canvas.style.zIndex = '9999';
      // Exposure per spec: -0.15 offset from normal, plus warm boost
      this.renderer.toneMappingExposure = 1.2;
      // Warm ambient for above-water
      if (this.ambientLight) {
        this.ambientLight.color.set(0x664422);
        this.ambientLight.intensity = 0.8;
      }
    });
    
    // Gentle micro-drift during vista — eye-level over the water
    tl.to(this.camera.position, {
      x: 0.3,
      y: 2.0,
      z: 6.2,
      duration: 2.5,
      ease: 'power1.inOut',
      onUpdate: () => {
        // Keep looking at horizon with gentle sway
        this.camera.lookAt(0, 0.5 + Math.sin(tl.time() * 0.4) * 0.15, -100);
      }
    }, 0);
    
    // Over-exposure — blown-out sun highlights
    tl.to({}, {
      duration: 2.0,
      onUpdate: () => {
        if (this.postProcessing) {
          const t = tl.time() / 2.0;
          // Gentle pulse of over-exposure — sun breathing
          const overExp = 0.06 + Math.sin(t * Math.PI * 2) * 0.03;
          this.postProcessing.setOverExposure(overExp);
        }
      }
    }, 0);
    
    // Water surface gentle shimmer
    tl.to(this.waterMaterial.uniforms.uPhase, {
      value: 0.15,
      duration: 2.5,
      ease: 'power1.inOut'
    }, 0);
    
    // Update sun shader time
    tl.to({}, {
      duration: 2.5,
      onUpdate: () => {
        const t = tl.time();
        if (this.sunMesh && this.sunMesh.material.uniforms) {
          this.sunMesh.material.uniforms.uTime.value = t;
        }
        if (this.horizonGlow && this.horizonGlow.material.uniforms) {
          this.horizonGlow.material.uniforms.uTime.value = t;
        }
      }
    }, 0);
    
    // ───────────────────────────────────────────────────────────
    // PHASE 2: ARC & TILT DOWN (2.5s → 4.5s)
    // The camera begins arcing like a dolphin — from looking at
    // the horizon to looking down at the water surface.
    // The sunset fades from the background. Ocean takes over.
    // The camera drops altitude. Speed builds.
    // ───────────────────────────────────────────────────────────
    
    tl.call(() => {
      this.phase = 'descent';
      document.body.classList.add('hide-cursor');
    }, [], 2.5);
    
    // Camera follows a smooth CURVED arc — dolphin crest then dive
    // From eye-level, rises slightly then swoops down into the water
    const descentCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.3, 2.0, 6.2),   // start: eye-level vista
      new THREE.Vector3(0.5, 3.5, 4.0),   // rise slightly — dolphin crest
      new THREE.Vector3(0.8, 4.0, 2.0),   // peak of arc — briefly above
      new THREE.Vector3(0.5, 3.0, 0.5),   // begin tipping over
      new THREE.Vector3(0.2, 1.8, -1.0),  // descending, still above water
      new THREE.Vector3(0.0, 1.0, -2.0),  // approaching surface
    ], false, 'catmullrom', 0.5);
    
    // LookAt: from horizon to looking down at water
    const lookAtCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.5, -100),     // looking at horizon
      new THREE.Vector3(0, 1.0, -60),      // still distant
      new THREE.Vector3(0, 0.8, -30),      // gaze dropping
      new THREE.Vector3(0, 0.0, -10),      // looking at nearby water
      new THREE.Vector3(0, -0.5, -3.0),    // looking toward surface
      new THREE.Vector3(0, -1.0, -1.0),    // nearly straight down
    ], false, 'catmullrom', 0.5);
    
    // Follow the curved path — camera position and lookAt update each frame
    tl.to({ progress: 0 }, {
      progress: 1,
      duration: 2.0,
      ease: 'power2.in',
      onUpdate: () => {
        const p = (tl.time() - 2.5) / 2.0;
        const t = Math.max(0, Math.min(1, p));
        const pos = descentCurve.getPointAt(t);
        const look = lookAtCurve.getPointAt(t);
        this.camera.position.copy(pos);
        this.camera.lookAt(look);
      }
    }, 2.5);
    
    // Sky fades to ocean gradient — sunset dissolves
    tl.to({}, {
      duration: 2.0,
      ease: 'power2.in',
      onUpdate: () => {
        if (this.postProcessing) {
          const p = (tl.time() - 2.5) / 2.0;
          const t = Math.max(0, Math.min(1, p));
          this.postProcessing.setSkyFactor(1.0 - t);
        }
      }
    }, 2.5);
    
    // Water transitions from sunset reflection to underwater colors
    tl.to(this.waterMaterial.uniforms.uSunsetBlend, {
      value: 0,
      duration: 2.0,
      ease: 'power2.in'
    }, 2.5);
    
    // Over-exposure fades
    tl.to({}, {
      duration: 1.5,
      onUpdate: () => {
        if (this.postProcessing) {
          const p = (tl.time() - 2.5) / 1.5;
          const t = Math.max(0, Math.min(1, p));
          this.postProcessing.setOverExposure(0.06 * (1 - t));
        }
      }
    }, 2.5);
    
    // Sunset elements fade out
    tl.call(() => {
      if (this.sunsetElements) {
        this.sunsetElements.forEach(el => {
          if (el.material.uniforms) {
            // ShaderMaterial — just hide it
            gsap.to(el, { visible: false, duration: 0, delay: 1.5 });
          } else {
            gsap.to(el.material, { opacity: 0, duration: 1.5 });
          }
        });
      }
      // Fade sunset directional light
      if (this.sunsetLight) gsap.to(this.sunsetLight, { intensity: 0, duration: 1.5 });
    }, [], 2.5);
    
    // Exposure normalizes
    tl.to(this.renderer, {
      toneMappingExposure: 1.0,
      duration: 1.5,
      ease: 'power1.in'
    }, 2.5);
    
    // Ambient light shifts from warm sunset to cool ocean
    tl.call(() => {
      if (this.ambientLight) {
        gsap.to(this.ambientLight.color, {
          r: 0.04, g: 0.29, b: 0.43,
          duration: 2.0
        });
        gsap.to(this.ambientLight, { intensity: 0.4, duration: 2.0 });
      }
    }, [], 2.5);
    
    // Water surface starts agitating
    tl.to(this.waterMaterial.uniforms.uPhase, {
      value: 0.5,
      duration: 2.0,
      ease: 'power2.in'
    }, 2.5);
    
    // ───────────────────────────────────────────────────────────
    // PHASE 3: ACCELERATION (4.5s → 5.8s)
    // Terminal velocity. The camera is plunging toward the surface.
    // FOV widens (vertigo). Water fills the screen.
    // The surface is rushing at you.
    // ───────────────────────────────────────────────────────────
    
    tl.call(() => {
      this.phase = 'acceleration';
      document.body.classList.add('no-pointer');
    }, [], 4.5);
    
    // Camera plunges in a smooth arc toward the water surface
    const plungeCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.0, 1.0, -2.0),   // entry from descent curve
      new THREE.Vector3(-0.1, 0.6, -2.5),  // slight lateral drift
      new THREE.Vector3(0.0, 0.3, -2.8),   // skimming the surface
      new THREE.Vector3(0.05, 0.1, -3.0),  // just above water
    ], false, 'catmullrom', 0.5);
    
    tl.to({ progress: 0 }, {
      progress: 1,
      duration: 1.3,
      ease: 'power3.in',
      onUpdate: () => {
        const p = (tl.time() - 4.5) / 1.3;
        const t = Math.max(0, Math.min(1, p));
        const pos = plungeCurve.getPointAt(t);
        this.camera.position.copy(pos);
        // Look progressively more downward
        const lookY = -5 * (1 + t * 2.0);
        const lookZ = 25 * (1 - t * 0.8);
        this.camera.lookAt(0, lookY, lookZ);
      }
    }, 4.5);
    
    // FOV widens — vertigo, speed (65° base → 85°)
    tl.to(this.camera, {
      fov: 85,
      duration: 1.3,
      ease: 'power3.in',
      onUpdate: () => this.camera.updateProjectionMatrix()
    }, 4.5);
    
    // Water goes violent
    tl.to(this.waterMaterial.uniforms.uPhase, {
      value: 1.0,
      duration: 0.8,
      ease: 'power2.in'
    }, 4.8);
    
    // ───────────────────────────────────────────────────────────
    // PHASE 4: SPLASH IMPACT (5.8s)
    // SMASH through the water surface.
    // Splash shockwave. Screen distortion. Water rupture.
    // FOV snaps back violently. Camera punches below the surface.
    // ───────────────────────────────────────────────────────────
    
    // 5.7s — Brief surface contact moment (smooth arrival)
    tl.to(this.camera.position, {
      y: 0.05,
      duration: 0.15,
      ease: 'power2.in'
    }, 5.7);
    
    // 5.85s — SPLASH: the actual impact
    tl.call(() => {
      this.phase = 'splash';
      
      // Splash shockwave — intense but controlled
      if (this.postProcessing) {
        this.postProcessing.triggerSplash(0.5, 0.5, 1.4);
        this.postProcessing.spike(3.0, 0.5);
      }
    }, [], 5.85);
    
    // Camera punches THROUGH the surface
    tl.to(this.camera.position, {
      x: 0,
      y: -2.0,
      z: -3.0,
      duration: 0.4,
      ease: 'power3.out'
    }, 5.85);
    
    // Water ruptures
    tl.to(this.waterMaterial.uniforms.uRupture, {
      value: 1,
      duration: 0.3,
      ease: 'power3.in'
    }, 5.85);
    
    // FOV compression — 85 → 35 (dramatic snap back)
    tl.to(this.camera, {
      fov: 35,
      duration: 0.35,
      ease: 'power3.out',
      onUpdate: () => this.camera.updateProjectionMatrix()
    }, 5.9);
    
    // Smooth lookAt transition during punch-through
    tl.to({ v: 0 }, {
      v: 1,
      duration: 0.4,
      ease: 'power2.out',
      onUpdate: () => {
        const p = (tl.time() - 5.85) / 0.4;
        const t = Math.max(0, Math.min(1, p));
        const lookY = -1.0 * (1 - t) + (-8.0) * t;
        this.camera.lookAt(0, lookY, -3.0 * (1 - t) + 0.0 * t);
      }
    }, 5.85);
    
    // ───────────────────────────────────────────────────────────
    // PHASE 5: SINKING (6.2s → 8.5s)
    // The user is now underwater. VISUAL WEIGHT.
    // - Progressive screen-edge distortion (water creeping in)
    // - Darkening exposure
    // - Fog closes in
    // - Particles appear (marine snow / bubbles)
    // - Camera sinks slowly — water resistance
    // - FOV returns to normal
    // ───────────────────────────────────────────────────────────
    
    tl.call(() => {
      this.phase = 'submersion';
      // Environment switch
      this.scene.fog = new THREE.FogExp2(0x021020, 0.005);
      this.underwaterLight.intensity = 1.5;
      this.hasBreached = true;
      window.dispatchEvent(new CustomEvent('surfaceBreach'));
      document.body.classList.add('surface-breached');
      if (this.postProcessing) this.postProcessing.setZone('shallow');
      // Make sure sky is fully off
      if (this.postProcessing) this.postProcessing.setSkyFactor(0);
    }, [], 6.2);
    
    // Sinking distortion ramps up then fades — water turbulence
    tl.to({}, {
      duration: 2.3,
      ease: 'power2.out',
      onUpdate: () => {
        if (this.postProcessing) {
          const p = (tl.time() - 6.2) / 2.3;
          const t = Math.max(0, Math.min(1, p));
          // Ramp up to 0.8 in first half, fade to 0.1 in second half
          const sink = t < 0.4 ? t / 0.4 * 0.8 : 0.8 * (1 - (t - 0.4) / 0.6) + 0.05;
          this.postProcessing.setSinkDistortion(sink);
        }
      }
    }, 6.2);
    
    // Exposure drops — underwater darkness
    tl.to(this.renderer, {
      toneMappingExposure: 0.55,
      duration: 2.0,
      ease: 'power2.out'
    }, 6.2);
    
    // Camera sinks with water resistance
    tl.to(this.camera.position, {
      x: 0,
      y: -12,
      z: -2.0,
      duration: 2.3,
      ease: 'power1.out',
      onUpdate: () => {
        const y = this.camera.position.y;
        this.camera.lookAt(0, y - 5, -1.0);
      }
    }, 6.2);
    
    // FOV returns to cruising
    tl.to(this.camera, {
      fov: 35,
      duration: 1.8,
      ease: 'power2.out',
      onUpdate: () => this.camera.updateProjectionMatrix()
    }, 6.2);
    
    // Fog thickens as we descend
    tl.to({}, {
      duration: 2.0,
      onUpdate: () => {
        if (this.scene.fog) {
          const p = (tl.time() - 6.2) / 2.0;
          const t = Math.max(0, Math.min(1, p));
          this.scene.fog.density = 0.005 + t * 0.005;
        }
      }
    }, 6.2);
    
    // Camera rotation stabilizes
    tl.to(this.camera.rotation, {
      x: -0.15,
      y: 0,
      z: 0,
      duration: 1.5,
      ease: 'power2.out'
    }, 6.5);
    
    // Particles fade in — marine snow / bubbles
    tl.to(this.particles.material.uniforms.uOpacity, {
      value: 0.6,
      duration: 1.8
    }, 6.5);
    
    // Light shafts from surface above
    this.lightShafts.forEach((shaft, i) => {
      tl.to(shaft.material, {
        opacity: 0.15,
        duration: 1.2
      }, 6.5 + i * 0.15);
    });
    
    // Depth rings
    this.depthRings.forEach((ring, i) => {
      tl.to(ring.material, {
        opacity: 0.3,
        duration: 0.5
      }, 7.0 + i * 0.4);
    });
    
    // ACT 2 begins during sinking
    tl.call(() => {
      this.startAct2();
    }, [], 7.0);
    
    // ───────────────────────────────────────────────────────────
    // REENTRY (8.5s → 9.5s)
    // Sinking distortion clears. UI fades in. Scroll unlocks.
    // ───────────────────────────────────────────────────────────
    
    tl.call(() => {
      // Clear sinking distortion
      if (this.postProcessing) this.postProcessing.setSinkDistortion(0);
    }, [], 8.3);
    
    tl.call(() => {
      this.phase = 'complete';
      document.body.classList.add('underwater-mode');
      document.body.classList.remove('lock-scroll', 'no-pointer', 'hide-cursor', 'cinematic-mode');
      
      const canvas = document.querySelector('.canvas-container');
      if (canvas) canvas.style.zIndex = '1';
      
      // UI REENTRY — smooth fade in
      gsap.set('.hero__content', { visibility: 'visible', y: 0 });
      gsap.set('.hero__tag', { visibility: 'visible' });
      gsap.set('.hero__title-word', { visibility: 'visible', y: 0 });
      gsap.set('.hero__description', { visibility: 'visible' });
      gsap.set('.hero__cta', { visibility: 'visible' });
      gsap.set('.header', { visibility: 'visible' });
      
      gsap.to('.hero__content', { opacity: 1, duration: 1.5, ease: 'power2.out' });
      gsap.to('.hero__tag', { opacity: 1, duration: 1.0, ease: 'power2.out', delay: 0.2 });
      gsap.to('.hero__title-word', { opacity: 1, duration: 0.8, stagger: 0.1, ease: 'power2.out', delay: 0.3 });
      gsap.to('.hero__description', { opacity: 1, duration: 1.0, ease: 'power2.out', delay: 0.5 });
      gsap.to('.hero__cta', { opacity: 1, duration: 1.0, ease: 'power2.out', delay: 0.7 });
      gsap.to('.header', { opacity: 1, duration: 1.0, ease: 'power2.out', delay: 0.3 });
      
      window.dispatchEvent(new CustomEvent('unlockScroll'));
      window.dispatchEvent(new CustomEvent('cinematicComplete'));
      this.applyUnderwaterPhysics();
    }, [], 9.0);
  }

  // ═══════════════════════════════════════════════════════════
  // ACT 2: DISORIENTATION
  // The user must feel functional but unconfident.
  // ═══════════════════════════════════════════════════════════

  startAct2() {
    this.act2Started = true;
    
    // Set initial ACT 2 camera state — matches sinking endpoint
    this.camera.position.set(0, -12, -2.0);
    this.camera.rotation.set(-0.15, 0, 0);
  }

  applyUnderwaterPhysics() {
    // Underwater Lenis settings
    window.dispatchEvent(new CustomEvent('applyUnderwaterPhysics'));
  }

  // ACT 2 MATH - non-negotiable
  clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  animate() {
    if (!this.isAnimating) return;
    
    this.animationId = requestAnimationFrame(() => this.animate());
    
    // getDelta must come FIRST — getElapsedTime calls getDelta internally
    // so calling getElapsedTime first would reset delta to ~0
    const rawDelta = this.clock.getDelta();
    const elapsed = this.clock.elapsedTime;
    const time = elapsed - this.startTime;
    
    // ═══ REQ 1: UPDATE USER INTENT (every frame) ═══
    userIntent.update(rawDelta);
    userIntent.updatePerceptionShift(rawDelta);
    
    // ═══ REQ 4: TEMPORAL DISTORTION — time scale tied to user behavior ═══
    const delta = rawDelta * userIntent.timeScale;
    const effectiveTime = time; // keep raw time for shaders, use delta for movement
    
    if (this.waterMaterial) {
      this.waterMaterial.uniforms.uTime.value = effectiveTime;
    }
    
    // ══════════════════════════════════════════════════════
    // SUNSET + INTRO PHASE HANDLERS
    // During the sunset vista, the camera has gentle micro-drift
    // and the sun/horizon elements animate.
    // ══════════════════════════════════════════════════════
    
    if (this.phase === 'sunset') {
      // Sunset scene — animate sun shader time
      if (this.sunMesh && this.sunMesh.material.uniforms) {
        this.sunMesh.material.uniforms.uTime.value = effectiveTime;
      }
      if (this.horizonGlow && this.horizonGlow.material.uniforms) {
        this.horizonGlow.material.uniforms.uTime.value = effectiveTime;
      }
    }
    
    // ═══════════════════════════════════════════════════════════
    // ACT 2 SYSTEMS - USER-DRIVEN DISORIENTATION
    // ═══════════════════════════════════════════════════════════
    
    if (this.act2Started && (this.phase === 'submersion' || this.phase === 'complete')) {
      
      const scrollProgress = this.clamp(this.currentScrollY / this.maxScroll, 0, 1);
      const perceivedDepth = Math.pow(scrollProgress, 1.4) * 220;
      
      // ═══ REQ 6: EMOTIONAL PROGRESSION — update lighting envelope ═══
      this.updateEmotionalLighting(delta);
      
      // ═══ THE FRACTURE (unchanged — designed instability) ═══
      if (!this.fractureTriggered && this.phase === 'complete' && scrollProgress > this.fractureThreshold) {
        this.fractureTriggered = true;
        this.fractureActive = true;
        this.fractureStart = time;
        try { sessionStorage.setItem('aurora_fractured', 'true'); } catch(e) {}
        if (this.postProcessing) this.postProcessing.spike(3.0, 1.0);
        
        // REQ 4: Fracture triggers the perception shift
        if (!this.perceptionShiftPlayed) {
          this.perceptionShiftPlayed = true;
          userIntent.triggerPerceptionShift();
        }
      }
      
      if (this.fractureActive) {
        const fe = time - this.fractureStart;
        const pathT = this.clamp(scrollProgress, 0, 0.999);
        const pathPos = this.cameraPath ? this.cameraPath.getPointAt(pathT) : null;
        
        if (fe < 0.8) {
          if (this.phase === 'complete' && pathPos) {
            const lieT = this.clamp(pathT * 0.3, 0, 0.999);
            const liePos = this.cameraPath.getPointAt(lieT);
            this.camera.position.lerp(liePos, 0.1);
          }
          this.camera.rotation.z = 0;
          if (this.scene.fog) this.scene.fog.density = 0.005;
          this.depthObjects.forEach(obj => {
            obj.scale.copy(obj.userData.originalScale);
            obj.rotation.x += 0.002;
            obj.rotation.y += 0.001;
          });
          
        } else if (fe < 1.1) {
          const slam = Math.min((fe - 0.8) / 0.3, 1);
          const intensity = 1 + slam * 1.5;
          
          if (this.phase === 'complete' && pathPos) {
            this.camera.position.lerp(pathPos, 0.15);
          }
          this.camera.rotation.z = Math.sin(time * 0.35) * 0.08 * intensity;
          if (this.scene.fog) {
            this.scene.fog.density = (0.06 + Math.sin(time * 0.6) * 0.015) * intensity;
          }
          this.depthObjects.forEach(obj => {
            const depthFactor = this.clamp(
              (this.camera.position.y - obj.userData.originalY) / 200, 0, 1
            );
            const s = 1 - depthFactor * 0.15 * intensity;
            obj.scale.copy(obj.userData.originalScale).multiplyScalar(s);
            obj.rotation.x += 0.002;
            obj.rotation.y += 0.001;
          });
          
        } else if (fe < 2.2) {
          const recovery = (fe - 1.1) / 1.1;
          const intensity = 2.5 - recovery * 1.5;
          
          if (this.phase === 'complete' && pathPos) {
            this.camera.position.lerp(pathPos, 0.05 + recovery * 0.05);
          }
          this.camera.rotation.z = Math.sin(time * 0.35) * 0.08 * intensity;
          if (this.scene.fog) {
            this.scene.fog.density = (0.06 + Math.sin(time * 0.6) * 0.015) * intensity;
          }
          this.depthObjects.forEach(obj => {
            const depthFactor = this.clamp(
              (this.camera.position.y - obj.userData.originalY) / 200, 0, 1
            );
            const s = 1 - depthFactor * (0.15 + this.scarOffsets.compression);
            obj.scale.copy(obj.userData.originalScale).multiplyScalar(s);
            obj.rotation.x += 0.002;
            obj.rotation.y += 0.001;
          });
          
        } else {
          this.fractureActive = false;
          this.scarActive = true;
          this.scarOffsets = { roll: 0.018, fog: 0.008, compression: 0.03 };
          try { sessionStorage.setItem('aurora_scarred', 'true'); } catch(e) {}
          window.dispatchEvent(new CustomEvent('physicsScar'));
        }
        
      } else {
        // ═══ NORMAL DOCTRINE — ALL 6 REQUIREMENTS ACTIVE ═══
        
        if (this.phase === 'complete' && this.cameraPath && this.cameraLookPath) {
          const t = this.clamp(scrollProgress, 0, 0.999);
          const pathPos = this.cameraPath.getPointAt(t);
          const lookPos = this.cameraLookPath.getPointAt(t);
          
          // ═══ REQ 2: IDLE DRIFT — camera moves even when scroll is still ═══
          // When user lingers, the camera drifts subtly off-spline
          // The world breathes. You can't hold it still.
          const linger = userIntent.lingerFactor;
          this.idleDrift.x += (Math.sin(time * 0.13) * 3 * linger - this.idleDrift.x) * 0.01;
          this.idleDrift.y += (Math.sin(time * 0.09) * 1.5 * linger - this.idleDrift.y) * 0.01;
          this.idleDrift.z += (Math.cos(time * 0.11) * 2 * linger - this.idleDrift.z) * 0.01;
          
          const driftedPos = pathPos.clone().add(this.idleDrift);
          
          // ═══ REQ 4: PERCEPTION SHIFT — gravity inversion ═══
          // During the shift, Y-axis inverts — surface becomes abyss
          if (userIntent.perceptionShiftActive) {
            const sp = userIntent.perceptionShiftProgress;
            const invertPhase = Math.sin(sp * Math.PI); // 0→1→0 arc
            this.invertedGravityFactor += (invertPhase - this.invertedGravityFactor) * 0.05;
            // Flip camera Y relative to path center
            const centerY = (pathPos.y + this.cameraPath.getPointAt(0).y) * 0.5;
            driftedPos.y = pathPos.y + (centerY - pathPos.y) * this.invertedGravityFactor * 2;
          } else {
            this.invertedGravityFactor *= 0.95;
          }
          
          // ═══ REQ 1: CAMERA LERP SPEED RESPONDS TO USER INTENT ═══
          // Rushing = camera snaps faster. Lingering = dreamy, slow follow.
          const baseLerp = 0.05;
          const intentLerp = baseLerp + userIntent.rushFactor * 0.08 - userIntent.lingerFactor * 0.03;
          const cameraLerp = Math.max(0.01, Math.min(0.15, intentLerp));
          
          this.camera.position.lerp(driftedPos, cameraLerp);
          
          // Look-at with smooth interpolation
          const currentLook = new THREE.Vector3();
          this.camera.getWorldDirection(currentLook);
          const targetLook = lookPos.clone().sub(this.camera.position).normalize();
          currentLook.lerp(targetLook, cameraLerp * 0.8);
          this.camera.lookAt(this.camera.position.clone().add(currentLook));
        }
        
        // CAMERA ROLL — modulated by emotional phase + hesitation
        const emotionRollScale = this.emotionLighting.motionScale;
        const hesitationRoll = userIntent.hesitationFactor * Math.sin(time * 2.5) * 0.04;
        const roll = Math.sin(time * 0.35) * 0.08 * emotionRollScale + hesitationRoll;
        this.camera.rotation.z = roll + this.scarOffsets.roll;
        
        // DEPTH COMPRESSION
        this.depthObjects.forEach(obj => {
          const depthFactor = this.clamp(
            (this.camera.position.y - obj.userData.originalY) / 200, 0, 1
          );
          const s = 1 - depthFactor * (0.15 + this.scarOffsets.compression);
          obj.scale.copy(obj.userData.originalScale).multiplyScalar(s);
          obj.rotation.x += 0.002 * userIntent.timeScale;
          obj.rotation.y += 0.001 * userIntent.timeScale;
        });
        
        // FOG — emotional phase modulates density + scar
        const emotionFogBoost = this.emotionLighting.intensity < 0.3 ? 0.02 : 0;
        if (this.scene.fog) {
          this.scene.fog.density = 0.06 + this.scarOffsets.fog + emotionFogBoost 
            + Math.sin(time * 0.6) * 0.015;
        }
      }
      
      // Update particles and light shafts
      this.updateParticles(effectiveTime);
      this.updateLightShafts(effectiveTime);
      
      // ═══ REQ 3: CREATURE AI WITH AGENCY ═══
      this.updateCreatures(effectiveTime, delta);
      
      // ═══ LIGHT BEAMS — respond to cursor dwell (REQ 1/5) ═══
      this.updateLightBeamsUserDriven(effectiveTime);
      
      // ═══ DATA VISUALIZATION GLYPHS — state-based (REQ 5) ═══
      this.updateDataGlyphs(effectiveTime);
      
      // ═══ REQ 2: FUZZY ZONE TRANSITIONS (gated by user rhythm) ═══
      if (this.phase === 'complete' && this.postProcessing) {
        this.updateFuzzyZones(scrollProgress, delta);
      }
    }
    
    // Render through post-processing pipeline
    if (this.postProcessing) {
      this.postProcessing.render(rawDelta); // raw delta for consistent PP timing
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  updateParticles(time) {
    if (!this.particles) return;
    
    const positions = this.particles.geometry.attributes.position.array;
    
    for (let i = 0; i < positions.length / 3; i++) {
      const vel = this.particleVelocities[i];
      if (!vel) continue;
      
      positions[i * 3 + 1] += vel.y;
      positions[i * 3] += Math.sin(time + vel.phase) * 0.02;
      positions[i * 3 + 2] += Math.cos(time * 0.7 + vel.phase) * 0.02;
      
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

  // ═══════════════════════════════════════════════════════════
  // REQ 3: CREATURE AI — AGENCY, NOT SCRIPTS
  // Fish have moods that respond to user intent.
  // territorial (rush) | curious (linger) | guiding (unlocked)
  // ═══════════════════════════════════════════════════════════

  updateCreatures(time, delta) {
    const camPos = this.camera.position;
    const rush = userIntent.rushFactor;
    const linger = userIntent.lingerFactor;
    const hesitation = userIntent.hesitationFactor;
    
    // ─── MOOD DETERMINATION ───
    // Mood is a weighted blend of user behavior, not a switch
    if (rush > 0.5) {
      this.creatureMood = 'territorial';  // rushing → fish resist
    } else if (linger > 0.6 && hesitation < 0.3) {
      this.creatureMood = 'curious';      // lingering calmly → fish approach
    } else if (userIntent.guideFishUnlocked && linger > 0.7) {
      this.creatureMood = 'guiding';      // deep lingering → guide emerges
    } else {
      this.creatureMood = 'neutral';
    }
    
    this.creatures.forEach((fish, i) => {
      const ud = fish.userData;
      const t = time * ud.speed + ud.phase;
      
      // Orbit around school center
      const orbitX = Math.cos(t) * ud.orbitRadius;
      const orbitZ = Math.sin(t) * ud.orbitRadius;
      const bobY = Math.sin(t * 1.5) * ud.verticalAmplitude;
      
      // Base position
      let baseX = ud.schoolCenter.x + orbitX;
      let baseY = ud.originalY + bobY;
      let baseZ = ud.schoolCenter.z + orbitZ;
      
      // Distance to camera
      const dx = baseX - camPos.x;
      const dy = baseY - camPos.y;
      const dz = baseZ - camPos.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      
      // ─── MOOD-DRIVEN BEHAVIOR ───
      
      if (this.creatureMood === 'territorial') {
        // REQ 3: TERRITORIAL — fish scatter to DEEPER zones when user rushes
        // Flee radius expands. School centers drift downward.
        const expandedFleeRadius = ud.fleeRadius * (1 + rush * 2);
        if (dist < expandedFleeRadius) {
          const fleeFactor = (1 - dist / expandedFleeRadius) * 20;
          ud.fleeOffset.set(
            dx / dist * fleeFactor,
            Math.abs(dy / dist) * fleeFactor * -1.5, // bias downward
            dz / dist * fleeFactor
          );
        } else {
          ud.fleeOffset.multiplyScalar(0.92);
        }
        // School center sinks when user rushes
        ud.schoolCenter.y += (-10 - ud.schoolCenter.y + ud.originalY) * rush * delta * 0.5;
        
      } else if (this.creatureMood === 'curious') {
        // REQ 3: CURIOUS — fish gather, form patterns near camera
        // When user pauses, fish slowly approach and form a loose arc
        const approachDist = 35;
        if (dist > approachDist) {
          // Drift toward camera
          const approachForce = linger * 0.3;
          ud.fleeOffset.x += (-dx / dist * approachForce - ud.fleeOffset.x) * 0.02;
          ud.fleeOffset.y += (-dy / dist * approachForce * 0.5 - ud.fleeOffset.y) * 0.02;
          ud.fleeOffset.z += (-dz / dist * approachForce - ud.fleeOffset.z) * 0.02;
        } else {
          // Maintain distance — orbit at approach distance
          const repel = (approachDist - dist) * 0.1;
          ud.fleeOffset.set(
            dx / dist * repel,
            dy / dist * repel * 0.3,
            dz / dist * repel
          );
        }
        // Tighter school formation when curious
        const schoolPull = 0.01 * linger;
        baseX += (ud.schoolCenter.x - baseX) * schoolPull;
        baseZ += (ud.schoolCenter.z - baseZ) * schoolPull;
        
      } else if (this.creatureMood === 'guiding' && i === 0) {
        // REQ 5: GUIDE FISH — one fish becomes a guide (state unreachable passively)
        // Only the first fish becomes the guide. It leads ahead on the path.
        if (!this.guideFish) this.guideFish = fish;
        const scrollP = this.clamp(this.currentScrollY / this.maxScroll, 0, 1);
        const guideT = this.clamp(scrollP + 0.05, 0, 0.999);
        if (this.cameraPath) {
          const guidePos = this.cameraPath.getPointAt(guideT);
          // Lead slightly to the side
          guidePos.x += Math.sin(time * 0.5) * 8;
          guidePos.z += Math.cos(time * 0.3) * 5;
          baseX = guidePos.x;
          baseY = guidePos.y;
          baseZ = guidePos.z;
          ud.fleeOffset.set(0, 0, 0);
          // Guide fish glows brighter
          fish.material.emissiveIntensity = 1.2 + Math.sin(time * 3) * 0.3;
        }
      } else {
        // NEUTRAL — standard flee behavior
        if (dist < ud.fleeRadius) {
          const fleeFactor = (1 - dist / ud.fleeRadius) * 15;
          ud.fleeOffset.set(
            dx / dist * fleeFactor,
            dy / dist * fleeFactor * 0.5,
            dz / dist * fleeFactor
          );
        } else {
          ud.fleeOffset.multiplyScalar(0.95);
        }
      }
      
      fish.position.set(
        baseX + ud.fleeOffset.x,
        baseY + ud.fleeOffset.y,
        baseZ + ud.fleeOffset.z
      );
      
      // Face movement direction
      const moveDir = Math.atan2(
        Math.cos(t) * ud.orbitRadius * ud.speed + ud.fleeOffset.x * 0.1,
        -Math.sin(t) * ud.orbitRadius * ud.speed + ud.fleeOffset.z * 0.1
      );
      fish.rotation.y = moveDir;
      
      // Body undulation — faster when territorial, slower when curious
      const undulationSpeed = this.creatureMood === 'territorial' ? 5 : 
                              this.creatureMood === 'curious' ? 1.5 : 3;
      fish.rotation.z = Math.sin(t * undulationSpeed) * 0.15;
      
      // Bioluminescent pulse — brighter in deep zones + emotional phase boost
      const depthGlow = this.clamp((-fish.position.y - 100) / 150, 0, 1);
      const emotionGlow = userIntent.emotionalPhaseIndex >= 3 ? 0.4 : 0; // revelation glow
      if (fish.material.emissiveIntensity !== undefined && this.creatureMood !== 'guiding') {
        fish.material.emissiveIntensity = 0.4 + depthGlow * 0.8 + emotionGlow + Math.sin(t * 2) * 0.15;
      }
    });
  }

  // ═══════════════════════════════════════════════════════════
  // REQ 2: FUZZY ZONE TRANSITIONS
  // Zones blend, don't snap. Gated by user rhythm.
  // Rushing locks the gate. Pausing opens it.
  // ═══════════════════════════════════════════════════════════

  updateFuzzyZones(scrollProgress, delta) {
    // Determine the target zone from scroll position
    let targetZone = 'shallow';
    for (const [zone, threshold] of Object.entries(this.depthZoneThresholds)) {
      if (scrollProgress >= threshold) targetZone = zone;
    }
    
    if (targetZone !== this.currentZone) {
      // ═══ REQ 1/2: Zone transition is GATED by user rhythm ═══
      // If user is rushing, the zone refuses to change until they pause
      if (this.pendingZone !== targetZone) {
        this.pendingZone = targetZone;
        this.zoneBlend = 0;
      }
      
      const canTransition = userIntent.requestZoneTransition();
      
      if (canTransition) {
        // Blend toward the new zone over time (not instant)
        this.zoneBlend = Math.min(1, this.zoneBlend + delta * 0.5);
        
        if (this.zoneBlend >= 1) {
          // Transition complete
          this.currentZone = targetZone;
          this.pendingZone = null;
          this.zoneBlend = 0;
          this.postProcessing.setZone(targetZone);
          
          // Full atmospheric transition
          this.applyZoneAtmosphere(targetZone);
        } else {
          // ═══ REQ 2: FUZZY BLEND between zones ═══
          // Fog, lighting, PP all interpolate between current and pending
          const currentZL = this.zoneLighting[this.currentZone];
          const pendingZL = this.zoneLighting[targetZone];
          if (currentZL && pendingZL && this.scene.fog) {
            const b = this.zoneBlend;
            const fogColor = new THREE.Color(currentZL.fog).lerp(new THREE.Color(pendingZL.fog), b);
            this.scene.fog.color.copy(fogColor);
            this.renderer.toneMappingExposure = currentZL.exposure + (pendingZL.exposure - currentZL.exposure) * b;
            
            // Blend background gradient
            this.postProcessing.setZoneBackground(
              new THREE.Color(currentZL.bgTop).lerp(new THREE.Color(pendingZL.bgTop), b),
              new THREE.Color(currentZL.bgMid).lerp(new THREE.Color(pendingZL.bgMid), b),
              new THREE.Color(currentZL.bgBottom).lerp(new THREE.Color(pendingZL.bgBottom), b)
            );
          }
        }
      }
      // If can't transition: zone stays current. User sees depth change
      // but the world resists updating. Creates tension.
    }
  }

  applyZoneAtmosphere(zone) {
    const zl = this.zoneLighting[zone];
    if (!zl || !this.scene.fog) return;
    
    gsap.to(this.scene.fog.color, {
      r: new THREE.Color(zl.fog).r,
      g: new THREE.Color(zl.fog).g,
      b: new THREE.Color(zl.fog).b,
      duration: 2, ease: 'power2.out'
    });
    gsap.to(this.renderer, {
      toneMappingExposure: zl.exposure,
      duration: 2, ease: 'power2.out'
    });
    this.postProcessing.setZoneBackground(
      new THREE.Color(zl.bgTop),
      new THREE.Color(zl.bgMid),
      new THREE.Color(zl.bgBottom)
    );
    
    if (this.mainLight) {
      gsap.to(this.mainLight, {
        intensity: zl.ambientI * 1.5 * this.emotionLighting.intensity / 0.6,
        duration: 2
      });
    }
    if (this.underwaterLight) {
      const deepGlow = zone === 'midnight' || zone === 'abyss' ? 2.5 : 1.0;
      gsap.to(this.underwaterLight, { intensity: deepGlow, duration: 2 });
      gsap.to(this.underwaterLight.color, {
        r: new THREE.Color(zl.ambient).r,
        g: new THREE.Color(zl.ambient).g,
        b: new THREE.Color(zl.ambient).b,
        duration: 2
      });
    }
  }

  // ═══════════════════════════════════════════════════════════
  // REQ 6: EMOTIONAL LIGHTING PROGRESSION
  // curiosity=calm | uncertainty=dim | confrontation=violent
  // revelation=soft glow | transformation=subtle aurora
  // ═══════════════════════════════════════════════════════════

  updateEmotionalLighting(delta) {
    const phase = userIntent.emotionalPhaseIndex;
    const progress = userIntent.phaseProgress;
    
    // Target parameters per emotional phase
    const emotionTargets = [
      // 0: curiosity — calm, slow, passive
      { intensity: 0.6, colorShift: 0, motionScale: 0.7, interactionResistance: 0 },
      // 1: uncertainty — dim, unpredictable, resistive
      { intensity: 0.35, colorShift: 0.2, motionScale: 1.3, interactionResistance: 0.3 },
      // 2: confrontation — violent, chaotic, dynamic
      { intensity: 0.9, colorShift: 0.5, motionScale: 2.0, interactionResistance: 0.6 },
      // 3: revelation — soft glow, guided, responsive
      { intensity: 0.7, colorShift: -0.1, motionScale: 0.5, interactionResistance: -0.2 },
      // 4: transformation — subtle aurora, harmonic, cohesive
      { intensity: 0.55, colorShift: -0.3, motionScale: 0.4, interactionResistance: -0.5 },
    ];
    
    const current = emotionTargets[phase];
    const next = emotionTargets[Math.min(phase + 1, 4)];
    
    // Interpolate between current and next based on progress within phase
    const t = progress;
    const target = {
      intensity: current.intensity + (next.intensity - current.intensity) * t,
      colorShift: current.colorShift + (next.colorShift - current.colorShift) * t,
      motionScale: current.motionScale + (next.motionScale - current.motionScale) * t,
      interactionResistance: current.interactionResistance + (next.interactionResistance - current.interactionResistance) * t,
    };
    
    // Smooth interpolation
    const lerpRate = 0.02;
    this.emotionLighting.intensity += (target.intensity - this.emotionLighting.intensity) * lerpRate;
    this.emotionLighting.colorShift += (target.colorShift - this.emotionLighting.colorShift) * lerpRate;
    this.emotionLighting.motionScale += (target.motionScale - this.emotionLighting.motionScale) * lerpRate;
    this.emotionLighting.interactionResistance += (target.interactionResistance - this.emotionLighting.interactionResistance) * lerpRate;
    
    // Apply to scene
    if (this.mainLight) {
      this.mainLight.intensity = 0.8 * this.emotionLighting.intensity / 0.6;
    }
    
    // Confrontation PP violence
    if (phase === 2 && this.postProcessing) {
      this.postProcessing.targetChromatic = 0.005 + progress * 0.008;
      this.postProcessing.targetDistortion = 0.003 + progress * 0.006;
    }
    
    // Transformation — aurora color shift toward greens/purples
    if (phase >= 4 && this.postProcessing && this.postProcessing.compositeMat) {
      const auroraShift = Math.sin(performance.now() / 1000 * 0.3) * 0.5 + 0.5;
      // Subtle shift in background gradient toward aurora colors
      const auroraTop = new THREE.Color(0x041e42).lerp(new THREE.Color(0x1a0533), auroraShift * 0.3);
      const auroraBot = new THREE.Color(0x0891b2).lerp(new THREE.Color(0x06b6a0), auroraShift * 0.2);
      this.postProcessing.setZoneBackground(auroraTop, new THREE.Color(0x0a3d62), auroraBot);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // REQ 1/5: LIGHT BEAMS — respond to cursor dwell + mouse velocity
  // Beams align toward high-engagement areas where cursor lingers.
  // Different behavior at different depths based on mouse velocity.
  // ═══════════════════════════════════════════════════════════

  updateLightBeamsUserDriven(time) {
    const dwellX = userIntent.cursorDwellPosition.x;
    const dwellY = userIntent.cursorDwellPosition.y;
    const isDwelling = userIntent.cursorDwelling;
    const mouseIntensity = userIntent.mouseIntensity;
    
    this.lightBeams.forEach((beam, i) => {
      if (beam.material.uniforms) {
        beam.material.uniforms.uTime.value = time;
        
        // ═══ REQ 1: Beams tilt toward cursor dwell position ═══
        if (isDwelling && userIntent.cursorDwellDuration > 1.2) {
          // Convert dwell screen position to world-approximate angle
          const targetAngleX = (dwellY - 0.5) * 0.3;
          const targetAngleZ = (dwellX - 0.5) * -0.3;
          beam.rotation.x += (targetAngleX - beam.rotation.x) * 0.01;
          beam.rotation.z += (targetAngleZ - beam.rotation.z) * 0.01;
          // Brighten engaged beams
          beam.material.uniforms.uIntensity.value += (0.15 - beam.material.uniforms.uIntensity.value) * 0.02;
        } else {
          // Return to default
          beam.material.uniforms.uIntensity.value += (0.08 + Math.random() * 0.05 - beam.material.uniforms.uIntensity.value) * 0.01;
        }
        
        // ═══ REQ 5: Mouse velocity changes beam behavior per zone ═══
        // Surface: beams shimmer with mouse. Deep: beams are unresponsive.
        const depthReduction = this.clamp((-beam.position.y + 20) / 200, 0, 1);
        const velocityEffect = mouseIntensity * (1 - depthReduction);
        beam.material.uniforms.uIntensity.value += velocityEffect * 0.02;
      }
    });
  }

  // ═══════════════════════════════════════════════════════════
  // REQ 5: DATA GLYPH STATE-BASED INTERACTIVITY
  // Glyphs have 4 interaction levels, not auto-reveal:
  // 0=passive, 1=revealed (proximity), 2=expanded (cursor dwell),
  // 3=resonating (deep engagement)
  // ═══════════════════════════════════════════════════════════

  updateDataGlyphs(time) {
    const camY = this.camera.position.y;
    const isDwelling = userIntent.cursorDwelling;
    const dwellDuration = userIntent.cursorDwellDuration;
    const linger = userIntent.lingerFactor;
    const phase = userIntent.emotionalPhaseIndex;
    
    this.dataGlyphs.forEach((group, i) => {
      const ud = group.userData;
      if (!ud) return;
      
      // Distance from camera to this depth marker
      const distToCamera = Math.abs(camY - ud.baseY);
      
      // ─── INTERACTION LEVEL STATE MACHINE ───
      const revealDist = 60;
      const proximity = this.clamp(1 - distToCamera / revealDist, 0, 1);
      
      // Level 0 → 1: Camera proximity reveals the glyph (passive → revealed)
      let targetLevel = 0;
      if (proximity > 0.3) targetLevel = 1;
      
      // Level 1 → 2: Cursor dwell expands data panels (revealed → expanded)
      if (targetLevel >= 1 && isDwelling && dwellDuration > 2.0 && userIntent.dataPanelsExpanded) {
        targetLevel = 2;
      }
      
      // Level 2 → 3: Deep engagement triggers resonance (expanded → resonating)
      if (targetLevel >= 2 && linger > 0.7 && phase >= 3) {
        targetLevel = 3;
      }
      
      // Smooth transition between levels
      if (!ud._interactionLevel) ud._interactionLevel = 0;
      ud._interactionLevel += (targetLevel - ud._interactionLevel) * 0.03;
      
      const level = ud._interactionLevel;
      
      // Opacity scales with interaction level
      const baseOpacity = proximity * proximity;
      const expansionFactor = this.clamp(level / 2, 0, 1);
      const resonanceFactor = this.clamp((level - 2) / 1, 0, 1);
      
      // Ring shader
      if (ud.ringMat && ud.ringMat.uniforms) {
        ud.ringMat.uniforms.uTime.value = time;
        ud.ringMat.uniforms.uOpacity.value += (baseOpacity * (0.5 + expansionFactor * 0.5) - ud.ringMat.uniforms.uOpacity.value) * 0.05;
      }
      
      // Inner ring — only visible at level 1+
      if (ud.innerMat) {
        const innerTarget = level >= 1 ? baseOpacity * 0.4 * (1 + expansionFactor) : 0;
        ud.innerMat.opacity += (innerTarget - ud.innerMat.opacity) * 0.05;
      }
      
      // Ring rotation — faster at higher interaction levels
      if (ud.innerRing) {
        const rotSpeed = 0.3 + expansionFactor * 0.5 + resonanceFactor * 1.0;
        ud.innerRing.rotation.z = -time * rotSpeed + i;
      }
      
      // Scale expansion at level 2+ — panels "open up"
      const scaleTarget = 1 + expansionFactor * 0.3 + resonanceFactor * 0.2;
      group.scale.lerp(new THREE.Vector3(scaleTarget, scaleTarget, scaleTarget), 0.02);
      
      // Orbiting metrics — brighter and faster at higher levels
      if (ud.metrics) {
        ud.metrics.forEach(metric => {
          const mud = metric.userData;
          const speedMult = 1 + expansionFactor * 0.5 + resonanceFactor * 2;
          const angle = mud.angle + time * mud.speed * speedMult;
          const radiusMult = 1 + resonanceFactor * 0.5;
          metric.position.set(
            Math.cos(angle) * mud.radius * radiusMult,
            Math.sin(angle * 0.7) * 2 * (1 + resonanceFactor),
            Math.sin(angle) * mud.radius * radiusMult
          );
          metric.material.opacity += (baseOpacity * 0.5 * (1 + level * 0.3) - metric.material.opacity) * 0.05;
          
          // Resonance glow
          if (resonanceFactor > 0 && metric.material.emissive) {
            metric.material.emissiveIntensity = resonanceFactor * 1.5 * (0.7 + Math.sin(time * 4 + i) * 0.3);
          }
        });
      }
    });
  }

  onScroll(scrollY, scrollLimit) {
    this.currentScrollY = scrollY;
    this.maxScroll = scrollLimit || 2000;
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
    
    // Reset instability state
    this.fractureActive = false;
    this.fractureTriggered = false;
    
    window.removeEventListener('resize', this.resizeHandler);
    if (this.scrollListener) window.removeEventListener('scroll', this.scrollListener);
    if (this.clickHandler) window.removeEventListener('click', this.clickHandler);
    
    if (this.postProcessing) {
      this.postProcessing.dispose();
      this.postProcessing = null;
    }
    
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
    
    document.body.classList.remove(
      'lock-scroll', 'cinematic-mode', 'no-pointer', 
      'hide-cursor', 'surface-breached', 'underwater-mode'
    );
  }

  dispose() {
    this.destroy();
  }
}
