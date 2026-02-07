/**
 * Aurora Aqua - Post-Processing Pipeline
 * 
 * UNDERWATER VISUAL DOCTRINE
 * 
 * Bloom bleeds light like water carries it.
 * Chromatic aberration warps edges like refraction.
 * Water distortion moves the whole frame like current.
 * 
 * If the screen looks flat → reject.
 */

import * as THREE from 'three';
import { isMobile, getPerformanceTier } from '../utils/device.js';

export class PostProcessing {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.enabled = getPerformanceTier() !== 'low';
    this.isMobile = isMobile();
    
    // Effect intensities (animatable)
    this.bloomStrength = 0;
    this.chromaticStrength = 0;
    this.distortionStrength = 0;
    this.vignetteStrength = 0;
    this.time = 0;
    
    // Targets for smooth transitions
    // Camera optics: f/8 vignette 0.15, CA 0.02 per spec
    this.targetBloom = 0.4;
    this.targetChromatic = 0.02;
    this.targetDistortion = 0.002;
    this.targetVignette = 0.15;
    
    if (!this.enabled) return;
    
    this.init();
  }

  init() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio, 2);
    
    // Render targets
    this.renderTargetA = new THREE.WebGLRenderTarget(w * dpr, h * dpr, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType
    });
    
    this.renderTargetB = new THREE.WebGLRenderTarget(w * dpr, h * dpr, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
    });
    
    // Bloom targets (quarter resolution for performance)
    const bw = Math.floor(w * dpr * 0.25);
    const bh = Math.floor(h * dpr * 0.25);
    this.bloomTarget = new THREE.WebGLRenderTarget(bw, bh, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
    });
    this.bloomBlurTarget = new THREE.WebGLRenderTarget(bw, bh, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
    });
    
    // Fullscreen quad
    this.quadGeo = new THREE.PlaneGeometry(2, 2);
    
    // === BLOOM EXTRACT PASS ===
    this.bloomExtractMat = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        uThreshold: { value: 0.6 },
      },
      vertexShader: /*glsl*/`
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: /*glsl*/`
        uniform sampler2D tDiffuse;
        uniform float uThreshold;
        varying vec2 vUv;
        void main() {
          vec4 color = texture2D(tDiffuse, vUv);
          float brightness = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
          float contribution = max(0.0, brightness - uThreshold);
          gl_FragColor = vec4(color.rgb * contribution, 1.0);
        }
      `
    });
    
    // === GAUSSIAN BLUR PASS ===
    this.blurMat = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        uDirection: { value: new THREE.Vector2(1, 0) },
        uResolution: { value: new THREE.Vector2(bw, bh) },
      },
      vertexShader: /*glsl*/`
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: /*glsl*/`
        uniform sampler2D tDiffuse;
        uniform vec2 uDirection;
        uniform vec2 uResolution;
        varying vec2 vUv;
        
        void main() {
          vec2 texelSize = 1.0 / uResolution;
          vec4 result = vec4(0.0);
          
          // 9-tap Gaussian
          float weights[5];
          weights[0] = 0.227027;
          weights[1] = 0.1945946;
          weights[2] = 0.1216216;
          weights[3] = 0.054054;
          weights[4] = 0.016216;
          
          result += texture2D(tDiffuse, vUv) * weights[0];
          for (int i = 1; i < 5; i++) {
            vec2 offset = uDirection * texelSize * float(i) * 2.0;
            result += texture2D(tDiffuse, vUv + offset) * weights[i];
            result += texture2D(tDiffuse, vUv - offset) * weights[i];
          }
          
          gl_FragColor = result;
        }
      `
    });
    
    // === COMPOSITE PASS (bloom + chromatic aberration + distortion + vignette) ===
    this.compositeMat = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        tBloom: { value: null },
        uBloomStrength: { value: 0 },
        uChromaticStrength: { value: 0 },
        uDistortionStrength: { value: 0 },
        uVignetteStrength: { value: 0 },
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2(w, h) },
        // Ocean gradient background colors
        uBgTop: { value: new THREE.Color(0x041e42) },
        uBgMid: { value: new THREE.Color(0x0a3d62) },
        uBgBottom: { value: new THREE.Color(0x0891b2) },
        // Click ripple
        uRippleCenter: { value: new THREE.Vector2(-1, -1) },
        uRippleTime: { value: 0 },
        uRippleStrength: { value: 0 },
        // Splash impact shockwave (Act 1)
        uSplashTime: { value: -1.0 },
        uSplashStrength: { value: 0.0 },
        uSplashCenter: { value: new THREE.Vector2(0.5, 0.5) },
        // Over-exposure for suspension phase
        uOverExposure: { value: 0.0 },
        // Sunset sky system — 1.0 = full sunset sky, 0.0 = ocean gradient
        uSkyFactor: { value: 1.0 },
        // Sun position in screen UV
        uSunPos: { value: new THREE.Vector2(0.5, 0.50) },
        // Sinking distortion — progressive underwater warp during submersion
        uSinkDistortion: { value: 0.0 },
      },
      vertexShader: /*glsl*/`
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: /*glsl*/`
        uniform sampler2D tDiffuse;
        uniform sampler2D tBloom;
        uniform float uBloomStrength;
        uniform float uChromaticStrength;
        uniform float uDistortionStrength;
        uniform float uVignetteStrength;
        uniform float uTime;
        uniform vec2 uResolution;
        uniform vec3 uBgTop;
        uniform vec3 uBgMid;
        uniform vec3 uBgBottom;
        uniform vec2 uRippleCenter;
        uniform float uRippleTime;
        uniform float uRippleStrength;
        // Splash impact shockwave
        uniform float uSplashTime;
        uniform float uSplashStrength;
        uniform vec2 uSplashCenter;
        // Suspension over-exposure
        uniform float uOverExposure;
        // Sunset sky
        uniform float uSkyFactor;
        uniform vec2 uSunPos;
        // Sinking phase distortion
        uniform float uSinkDistortion;
        
        varying vec2 vUv;
        
        void main() {
          vec2 uv = vUv;
          
          // ═══ BACKGROUND SYSTEM — SUNSET SKY ↔ OCEAN GRADIENT ═══
          
          // Ocean gradient (underwater)
          vec3 oceanBg;
          if (uv.y > 0.5) {
            oceanBg = mix(uBgMid, uBgTop, (uv.y - 0.5) * 2.0);
          } else {
            oceanBg = mix(uBgBottom, uBgMid, uv.y * 2.0);
          }
          
          // ═══ PHYSICALLY-BASED ATMOSPHERE (Rayleigh + Mie scattering) ═══
          // Per spec: rayleigh 1.0, mie 0.85, mie_g 0.78, ozone 0.35, ground_albedo 0.12
          
          // View direction from UV (eye-level: horizon at y≈0.5)
          float viewY = (uv.y - 0.48) * 2.0; // -1 at bottom, +1 at top, 0 at horizon
          float viewAngle = max(viewY, -0.05); // angle above horizon (allow slight below)
          
          // Rayleigh scattering — blue/purple at zenith, warm at horizon
          // λ⁻⁴ dependency: blue scatters ~5.5x more than red
          vec3 rayleighCoeff = vec3(5.8e-3, 13.5e-3, 33.1e-3); // physically-based λ⁻⁴
          float rayleighPhase = 0.75 * (1.0 + viewAngle * viewAngle);
          float opticalDepth = 1.0 / (viewAngle + 0.15); // path length through atmosphere
          opticalDepth = min(opticalDepth, 12.0); // cap at horizon
          
          // Rayleigh extinction along path
          vec3 rayleighExtinction = exp(-rayleighCoeff * opticalDepth * 1.0);
          // Rayleigh in-scatter (what color reaches us)
          vec3 rayleighColor = (1.0 - rayleighExtinction) * rayleighPhase;
          
          // Mie scattering — warm haze at horizon (aerosol forward scatter)
          float mieCoeff = 21.0e-3;
          float cosTheta = dot(normalize(vec3(uv.x - 0.5, viewAngle, -1.0)),
                              normalize(vec3(uSunPos.x - 0.5, 0.05, -1.0)));
          // Henyey-Greenstein phase function (g=0.78)
          float g = 0.78;
          float miePhase = (1.0 - g*g) / (4.0 * 3.14159 * pow(1.0 + g*g - 2.0*g*cosTheta, 1.5));
          float mieExtinction = exp(-mieCoeff * opticalDepth * 0.85);
          float mieScatter = (1.0 - mieExtinction) * miePhase;
          
          // Sun color at this elevation (more orange/red at horizon)
          vec3 sunTransmittance = exp(-rayleighCoeff * opticalDepth * 0.5);
          vec3 sunColor = vec3(1.0, 0.85, 0.55) * sunTransmittance;
          sunColor = max(sunColor, vec3(0.3, 0.15, 0.05)); // don't let it go black
          
          // Combine atmospheric scattering
          vec3 skyBg = vec3(0.0);
          skyBg += rayleighColor * vec3(0.3, 0.4, 0.9) * 1.0;  // Rayleigh blue-purple
          skyBg += vec3(mieScatter) * sunColor * 2.5;           // Mie warm haze
          
          // Ozone absorption — subtle blue-green tint at mid-altitudes
          float ozoneFactor = exp(-abs(viewAngle - 0.3) * 3.0) * 0.35;
          skyBg += vec3(0.05, 0.08, 0.15) * ozoneFactor;
          
          // Ground albedo contribution — subtle warm uplighting at horizon
          float groundContrib = max(0.0, -viewY) * 0.12;
          skyBg += vec3(0.3, 0.2, 0.15) * groundContrib;
          
          // Aerial perspective — haze near horizon (strength 0.65)
          float aerial = exp(-abs(viewAngle) * 3.0) * 0.65;
          vec3 aerialColor = sunColor * 0.5 + vec3(0.25, 0.18, 0.12);
          skyBg = mix(skyBg, aerialColor, aerial);
          
          // Ensure spec target colors are hit:
          // Zenith should approach #4b5fae, horizon should approach #ff9a6a
          vec3 zenithTarget  = vec3(0.294, 0.373, 0.682); // #4b5fae
          vec3 horizonTarget = vec3(1.0, 0.604, 0.416);   // #ff9a6a
          float zenithMix = smoothstep(0.3, 1.0, viewAngle);
          float horizonMix = exp(-viewAngle * viewAngle * 15.0);
          skyBg = mix(skyBg, zenithTarget, zenithMix * 0.4);
          skyBg = mix(skyBg, horizonTarget, horizonMix * 0.35);
          
          // ═══ VOLUMETRIC CUMULUS-STRATIFORM CLOUDS ═══
          // Per spec: coverage 0.45, density 0.62, altitude 1800m
          // Sun-facing: #ffb08a, Shadow: #4a4f7a, edge_falloff 0.35
          
          // Clouds appear in sky above horizon (horizon now at ~0.5)
          float cloudZone = smoothstep(0.52, 0.68, uv.y); // above horizon
          float cloudFadeTop = smoothstep(0.97, 0.82, uv.y); // fade near zenith
          cloudZone *= cloudFadeTop;
          
          if (cloudZone > 0.001) {
            vec2 cUv = uv * vec2(4.0, 12.0); // wide, stretched cumulus shapes
            float drift = uTime * 0.015;
            
            // Layer 1 — large cumulus billows (coverage 0.45)
            float n1 = sin(cUv.x * 0.9 + drift) * cos(cUv.y * 0.5 - drift * 0.2);
            n1 += sin(cUv.x * 2.0 - drift * 1.1 + cUv.y * 1.2) * 0.55;
            n1 += sin(cUv.x * 0.5 + drift * 0.5) * cos(cUv.y * 1.8 + drift * 0.4) * 0.45;
            
            // Layer 2 — stratiform horizontal spread
            float n2 = sin(cUv.x * 3.5 + drift * 1.3 + 2.0) * cos(cUv.y * 2.0 - drift * 0.6) * 0.35;
            n2 += sin(cUv.x * 5.0 - drift * 1.7 + cUv.y * 3.5) * 0.18;
            
            // Layer 3 — fine edge detail
            float n3 = sin(cUv.x * 7.0 + drift * 2.0) * cos(cUv.y * 5.0 + drift * 1.0) * 0.12;
            n3 += sin(cUv.x * 10.0 - drift * 2.5 + cUv.y * 7.0) * 0.06;
            
            float cloudNoise = n1 + n2 + n3;
            // Coverage 0.45 — shift threshold to control density
            float cloudRaw = cloudNoise * 0.5 + 0.5;
            // Edge falloff 0.35 for soft edges
            float cloudMask = smoothstep(0.55, 0.55 + 0.35, cloudRaw); // coverage ~0.45
            cloudMask *= cloudZone;
            // Density 0.62
            cloudMask *= 0.62;
            
            // Volumetric lighting response
            vec3 cloudSunFacing = vec3(1.0, 0.690, 0.541);  // #ffb08a
            vec3 cloudShadow    = vec3(0.290, 0.310, 0.478); // #4a4f7a
            
            // Cloud height determines shadow mix
            float cloudHeight = (uv.y - 0.52) / 0.4;
            
            // Volumetric: sun-facing side is bright, shadow side is dark
            // Sun is at bottom of sky (horizon), so lower clouds are more lit
            float sunFacing = 1.0 - cloudHeight; // lower = more sun-lit
            
            // Sun proximity illumination
            float sunProx = length((uv - uSunPos) * vec2(1.8, 2.5));
            float sunLit = exp(-sunProx * sunProx * 3.0) * 0.6;
            sunFacing = clamp(sunFacing + sunLit, 0.0, 1.0);
            
            vec3 cloudColor = mix(cloudShadow, cloudSunFacing, sunFacing);
            
            // Rim/edge lighting — bright edges where sun backlit
            float edgeGlow = smoothstep(0.3, 0.55, cloudRaw) * (1.0 - smoothstep(0.55, 0.9, cloudRaw));
            cloudColor += vec3(1.0, 0.8, 0.5) * edgeGlow * sunLit * 0.4;
            
            // Blend clouds into sky
            skyBg = mix(skyBg, cloudColor, cloudMask * 0.75);
          }
          
          // Sun glow — at horizon center (eye-level)
          float sunDist = length((uv - uSunPos) * vec2(1.0, 2.0));
          float sunGlow = exp(-sunDist * sunDist * 10.0) * 0.8;
          float sunCore = exp(-sunDist * sunDist * 80.0) * 1.1;
          skyBg += vec3(1.0, 0.82, 0.38) * sunGlow;
          skyBg += vec3(1.0, 0.92, 0.78) * sunCore;
          
          // Horizon light band — at screen center (y=0.5)
          float horizonBand = exp(-pow((uv.y - 0.50) * 6.0, 2.0)) * 0.3;
          skyBg += vec3(1.0, 0.6, 0.25) * horizonBand;
          
          // Ocean reflections below horizon (bottom 50% of screen at eye-level)
          // Dark navy ocean base #243a5e with sun reflection path
          float reflectionZone = smoothstep(0.50, 0.05, uv.y);
          vec3 oceanBase = vec3(0.14, 0.227, 0.369); // #243a5e
          vec3 oceanDark = vec3(0.04, 0.08, 0.16);
          vec3 oceanReflect = mix(oceanDark, oceanBase, (1.0 - reflectionZone) * 0.6 + 0.2);
          // Narrow specular sun reflection path on water
          float sunReflPath = exp(-pow((uv.x - 0.5) * 4.0, 2.0)) * reflectionZone;
          vec3 sunReflCol = vec3(1.0, 0.690, 0.40); // #ffb066
          oceanReflect += sunReflCol * sunReflPath * 0.35;
          // Shimmer on water reflections
          float shimmer = sin(uv.x * 50.0 + uTime * 1.8) * sin(uv.x * 30.0 - uTime * 1.0) * 0.5 + 0.5;
          float shimmer2 = sin(uv.x * 70.0 + uTime * 2.5) * 0.5 + 0.5;
          oceanReflect += sunReflCol * shimmer * sunReflPath * 0.15;
          oceanReflect += vec3(0.8, 0.6, 0.3) * shimmer2 * sunReflPath * 0.08;
          // Fresnel: edges of water reflect more sky
          float waterFresnel = smoothstep(0.5, 0.35, uv.y) * 0.3;
          oceanReflect = mix(oceanReflect, skyBg * 0.4, waterFresnel);
          skyBg = mix(skyBg, oceanReflect, reflectionZone);
          
          // Blend: uSkyFactor = 1.0 → sunset sky, 0.0 → ocean gradient
          vec3 bgColor = mix(oceanBg, skyBg, uSkyFactor);
          
          // ═══ CLICK RIPPLE ═══
          // Shockwave from click position
          float rippleDist = length(uv - uRippleCenter);
          float rippleWave = sin((rippleDist - uRippleTime * 0.8) * 30.0) * exp(-rippleDist * 4.0) * exp(-uRippleTime * 2.0) * uRippleStrength;
          
          // ═══ SPLASH IMPACT SHOCKWAVE ═══
          // Exponentially decaying UV distortion centered on splash point
          // This is the "illegal moment" — reality tears at impact
          if (uSplashTime >= 0.0 && uSplashStrength > 0.001) {
            float splashDist = length(uv - uSplashCenter);
            float splashAmplitude = exp(-uSplashTime * 4.0) * uSplashStrength;
            float splashWave = sin(splashDist * 40.0 - uSplashTime * 15.0) * splashAmplitude;
            // Radial push from impact center
            vec2 splashDir = normalize(uv - uSplashCenter + 0.0001);
            uv += splashDir * splashWave * 0.06;
            // High-frequency lateral tear
            uv.x += sin(uv.y * 30.0 + uSplashTime * 12.0) * splashAmplitude * 0.08;
            uv.y += cos(uv.x * 25.0 + uSplashTime * 10.0) * splashAmplitude * 0.04;
          }
          
          // ═══ SINKING DISTORTION ═══
          // Progressive underwater warp during the submersion phase
          // Simulates looking through turbulent water as you sink
          if (uSinkDistortion > 0.001) {
            float sinkWaveX = sin(uv.y * 15.0 + uTime * 3.0) * uSinkDistortion * 0.015;
            float sinkWaveY = cos(uv.x * 12.0 + uTime * 2.5) * uSinkDistortion * 0.01;
            // Edge intensification — more warp at screen edges (water creeping in)
            float edgeDist = length((uv - 0.5) * 2.0);
            float edgeFactor = smoothstep(0.3, 1.0, edgeDist);
            sinkWaveX *= (1.0 + edgeFactor * 2.0);
            sinkWaveY *= (1.0 + edgeFactor * 2.0);
            uv += vec2(sinkWaveX, sinkWaveY);
          }
          
          // ═══ WATER DISTORTION ═══
          float distX = sin(uv.y * 8.0 + uTime * 0.4) * uDistortionStrength;
          float distY = cos(uv.x * 6.0 + uTime * 0.3) * uDistortionStrength * 0.7;
          distX += sin(uv.y * 25.0 + uTime * 1.2) * uDistortionStrength * 0.15;
          distY += cos(uv.x * 20.0 + uTime * 1.0) * uDistortionStrength * 0.1;
          
          // Ripple adds directional UV push
          vec2 rippleDir = normalize(uv - uRippleCenter + 0.001);
          distX += rippleDir.x * rippleWave * 0.02;
          distY += rippleDir.y * rippleWave * 0.02;
          
          vec2 distortedUv = uv + vec2(distX, distY);
          
          // ═══ CHROMATIC ABERRATION (lateral CA, per spec: 0.02) ═══
          // Models real lens lateral chromatic aberration:
          // Red shifts outward, blue shifts inward, stronger at edges
          vec2 center = uv - 0.5;
          float dist = length(center);
          // Cubic falloff — matches real lens CA behavior
          float chromaticAmount = uChromaticStrength * dist * (dist * dist + dist * 0.5);
          chromaticAmount += abs(rippleWave) * 0.003;
          
          // Red channel shifts outward (positive), blue inward (negative)
          vec2 uvR = distortedUv + center * chromaticAmount * 1.2;
          vec2 uvB = distortedUv - center * chromaticAmount * 0.8;
          
          vec4 texR = texture2D(tDiffuse, uvR);
          vec4 texG = texture2D(tDiffuse, distortedUv);
          vec4 texB = texture2D(tDiffuse, uvB);
          
          // ═══ ALPHA-AWARE COMPOSITING ═══
          // Scene rendered with alpha — blend over ocean gradient
          float sceneAlpha = texG.a;
          vec3 sceneColor = vec3(texR.r, texG.g, texB.b);
          
          // Blend scene over ocean gradient
          vec3 color = mix(bgColor, sceneColor, sceneAlpha);
          
          // ═══ BLOOM ═══
          vec3 bloom = texture2D(tBloom, distortedUv).rgb;
          color += bloom * uBloomStrength;
          
          // ═══ LENS VIGNETTE (cos⁴ law, f/8 aperture) ═══
          // Physically-based: cos⁴(θ) falloff from optical axis
          // Strength 0.15 per spec — subtle, natural darkening
          float cosTheta2 = 1.0 / (1.0 + dist * dist * 4.0);
          float cos4 = cosTheta2 * cosTheta2; // cos⁴ approximation
          float vignette = mix(1.0, cos4, uVignetteStrength);
          vignette = clamp(vignette, 0.0, 1.0);
          color *= vignette;
          
          // ═══ ACES TONE MAPPING (per spec) ═══
          // Operator: ACES, white point 1000 nits, black clip 0.01
          // Highlight desaturation: 0.25
          
          // Exposure: -0.15 (moody, slightly darker during sunset)
          color *= exp2(-0.15) * uSkyFactor + (1.0 - uSkyFactor) * 1.0;
          
          // ACES filmic tone mapping (Stephen Hill fit for sRGB)
          // White point: 1000 nits normalized to SDR
          {
            vec3 x = color;
            float a = 2.51;
            float bb = 0.03;
            float c = 2.43;
            float dd = 0.59;
            float ee = 0.14;
            color = clamp((x * (a * x + bb)) / (x * (c * x + dd) + ee), 0.0, 1.0);
          }
          
          // Black clip: 0.01 — lift shadows slightly
          color = max(color, vec3(0.01));
          
          // Highlight desaturation: 0.25 — desaturate bright areas
          float lumaTM = dot(color, vec3(0.2126, 0.7152, 0.0722));
          float highlightMask = smoothstep(0.6, 1.0, lumaTM);
          color = mix(color, vec3(lumaTM), highlightMask * 0.25);
          
          // Contrast: 1.08
          vec3 midGray = vec3(0.18);
          color = midGray + (color - midGray) * (1.0 + 0.08 * uSkyFactor);
          
          // Saturation: 1.12
          float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
          color = mix(vec3(luma), color, 1.0 + 0.12 * uSkyFactor);
          
          // Warmth bias: 0.22 (shift shadows warm during sunset)
          float warmShadow = (1.0 - luma) * 0.22 * uSkyFactor;
          color.r += warmShadow * 0.08;
          color.g += warmShadow * 0.02;
          color.b -= warmShadow * 0.06;
          
          // Subtle blue push in underwater shadows
          color.b += (1.0 - vignette) * 0.03 * (1.0 - uSkyFactor);
          
          // Ambient underwater light rays (matches CSS body::before)
          float ray1 = smoothstep(0.7, 0.0, length((uv - vec2(0.3, 0.8)) * vec2(1.25, 2.0))) * 0.06;
          float ray2 = smoothstep(0.6, 0.0, length((uv - vec2(0.7, 0.7)) * vec2(1.67, 2.5))) * 0.08;
          color += vec3(0.13, 0.83, 0.93) * (ray1 + ray2) * (1.0 - uSkyFactor);
          
          // ═══ OVER-EXPOSURE (suspension phase) ═══
          // Simulates blown-out specular highlights above the ocean surface
          color += vec3(1.0, 0.98, 0.95) * uOverExposure;
          color = clamp(color, 0.0, 1.0);
          
          gl_FragColor = vec4(color, 1.0);
        }
      `
    });
    
    this.bloomQuad = new THREE.Mesh(this.quadGeo, this.bloomExtractMat);
    this.blurQuad = new THREE.Mesh(this.quadGeo, this.blurMat);
    this.compositeQuad = new THREE.Mesh(this.quadGeo, this.compositeMat);
    
    this.bloomScene = new THREE.Scene();
    this.blurScene = new THREE.Scene();
    this.compositeScene = new THREE.Scene();
    this.orthoCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    
    this.bloomScene.add(this.bloomQuad);
    this.blurScene.add(this.blurQuad);
    this.compositeScene.add(this.compositeQuad);
    
    // Handle resize
    this.resizeHandler = () => this.resize();
    window.addEventListener('resize', this.resizeHandler);
  }

  resize() {
    if (!this.enabled) return;
    
    const w = window.innerWidth;
    const h = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio, 2);
    
    this.renderTargetA.setSize(w * dpr, h * dpr);
    this.renderTargetB.setSize(w * dpr, h * dpr);
    
    const bw = Math.floor(w * dpr * 0.25);
    const bh = Math.floor(h * dpr * 0.25);
    this.bloomTarget.setSize(bw, bh);
    this.bloomBlurTarget.setSize(bw, bh);
    
    this.blurMat.uniforms.uResolution.value.set(bw, bh);
    this.compositeMat.uniforms.uResolution.value.set(w, h);
  }

  // ═══════════════════════════════════════════════════════════
  // DEPTH ZONE PRESETS
  // Each zone has distinct visual character
  // ═══════════════════════════════════════════════════════════

  setZone(zone, duration = 1.5) {
    const presets = {
      surface: { bloom: 0.15, chromatic: 0.008, distortion: 0.001, vignette: 0.15 },
      shallow: { bloom: 0.35, chromatic: 0.02,  distortion: 0.002, vignette: 0.20 },
      twilight: { bloom: 0.55, chromatic: 0.03,  distortion: 0.004, vignette: 0.35 },
      midnight: { bloom: 0.75, chromatic: 0.04,  distortion: 0.006, vignette: 0.50 },
      abyss:   { bloom: 1.0,  chromatic: 0.06,  distortion: 0.008, vignette: 0.65 },
    };
    
    const preset = presets[zone] || presets.shallow;
    this.targetBloom = preset.bloom;
    this.targetChromatic = preset.chromatic;
    this.targetDistortion = preset.distortion;
    this.targetVignette = preset.vignette;
  }

  // Spike effects for dramatic moments (fracture, illegal moment)
  spike(intensity = 1, duration = 0.3) {
    if (!this.enabled) return;
    
    // Store current targets
    const prevChromatic = this.targetChromatic;
    const prevDistortion = this.targetDistortion;
    
    // Spike to extreme values
    this.targetChromatic = 0.02 * intensity;
    this.targetDistortion = 0.015 * intensity;
    
    // Restore after duration
    setTimeout(() => {
      this.targetChromatic = prevChromatic;
      this.targetDistortion = prevDistortion;
    }, duration * 1000);
  }

  // Click ripple shockwave — underwater shockwave from click point
  triggerRipple(x, y) {
    if (!this.enabled || !this.compositeMat) return;
    this.compositeMat.uniforms.uRippleCenter.value.set(x, 1.0 - y); // flip Y for UV space
    this.compositeMat.uniforms.uRippleTime.value = 0;
    this.compositeMat.uniforms.uRippleStrength.value = 1.0;
    this._rippleActive = true;
  }

  // ═══ SPLASH IMPACT SHOCKWAVE ═══
  // The signature illegal moment — exponentially decaying UV tear
  // centered on impact point. NOT the same as click ripple — this
  // is violent, physical, and breaks the visual contract.
  triggerSplash(x = 0.5, y = 0.5, strength = 1.0) {
    if (!this.enabled || !this.compositeMat) return;
    this.compositeMat.uniforms.uSplashCenter.value.set(x, 1.0 - y);
    this.compositeMat.uniforms.uSplashTime.value = 0;
    this.compositeMat.uniforms.uSplashStrength.value = strength;
    this._splashActive = true;
  }

  // Over-exposure for the suspension / apex phase
  setOverExposure(value) {
    if (!this.enabled || !this.compositeMat) return;
    this.compositeMat.uniforms.uOverExposure.value = value;
  }

  // Sunset sky factor — 1.0 = full sunset, 0.0 = ocean gradient
  setSkyFactor(value) {
    if (!this.enabled || !this.compositeMat) return;
    this.compositeMat.uniforms.uSkyFactor.value = Math.max(0, Math.min(1, value));
  }

  // Sinking distortion intensity (0 = none, 1 = full underwater warp)
  setSinkDistortion(value) {
    if (!this.enabled || !this.compositeMat) return;
    this.compositeMat.uniforms.uSinkDistortion.value = value;
  }

  // Update zone background gradient colors to match depth
  setZoneBackground(topColor, midColor, bottomColor) {
    if (!this.enabled || !this.compositeMat) return;
    this.compositeMat.uniforms.uBgTop.value.set(topColor);
    this.compositeMat.uniforms.uBgMid.value.set(midColor);
    this.compositeMat.uniforms.uBgBottom.value.set(bottomColor);
  }

  render(delta) {
    if (!this.enabled) {
      this.renderer.render(this.scene, this.camera);
      return;
    }
    
    this.time += delta;
    
    // Smooth interpolation toward targets
    const lerpSpeed = 0.03;
    this.bloomStrength += (this.targetBloom - this.bloomStrength) * lerpSpeed;
    this.chromaticStrength += (this.targetChromatic - this.chromaticStrength) * lerpSpeed;
    this.distortionStrength += (this.targetDistortion - this.distortionStrength) * lerpSpeed;
    this.vignetteStrength += (this.targetVignette - this.vignetteStrength) * lerpSpeed;
    
    // Advance ripple timer
    if (this._rippleActive) {
      this.compositeMat.uniforms.uRippleTime.value += delta;
      if (this.compositeMat.uniforms.uRippleTime.value > 2.0) {
        this._rippleActive = false;
        this.compositeMat.uniforms.uRippleStrength.value = 0;
      }
    }
    
    // Advance splash shockwave timer
    if (this._splashActive) {
      this.compositeMat.uniforms.uSplashTime.value += delta;
      // Exponential decay — effectively gone after ~1.5s
      if (this.compositeMat.uniforms.uSplashTime.value > 2.0) {
        this._splashActive = false;
        this.compositeMat.uniforms.uSplashStrength.value = 0;
        this.compositeMat.uniforms.uSplashTime.value = -1.0;
      }
    }
    
    const currentRT = this.renderer.getRenderTarget();
    
    // 1. Render scene to target A
    this.renderer.setRenderTarget(this.renderTargetA);
    this.renderer.render(this.scene, this.camera);
    
    // 2. Bloom extract
    this.bloomExtractMat.uniforms.tDiffuse.value = this.renderTargetA.texture;
    this.renderer.setRenderTarget(this.bloomTarget);
    this.renderer.render(this.bloomScene, this.orthoCamera);
    
    // 3. Blur horizontal
    this.blurMat.uniforms.tDiffuse.value = this.bloomTarget.texture;
    this.blurMat.uniforms.uDirection.value.set(1, 0);
    this.renderer.setRenderTarget(this.bloomBlurTarget);
    this.renderer.render(this.blurScene, this.orthoCamera);
    
    // 4. Blur vertical
    this.blurMat.uniforms.tDiffuse.value = this.bloomBlurTarget.texture;
    this.blurMat.uniforms.uDirection.value.set(0, 1);
    this.renderer.setRenderTarget(this.bloomTarget);
    this.renderer.render(this.blurScene, this.orthoCamera);
    
    // 5. Second blur pass for smoother bloom
    this.blurMat.uniforms.tDiffuse.value = this.bloomTarget.texture;
    this.blurMat.uniforms.uDirection.value.set(1, 0);
    this.renderer.setRenderTarget(this.bloomBlurTarget);
    this.renderer.render(this.blurScene, this.orthoCamera);
    
    this.blurMat.uniforms.tDiffuse.value = this.bloomBlurTarget.texture;
    this.blurMat.uniforms.uDirection.value.set(0, 1);
    this.renderer.setRenderTarget(this.bloomTarget);
    this.renderer.render(this.blurScene, this.orthoCamera);
    
    // 6. Composite to screen
    this.compositeMat.uniforms.tDiffuse.value = this.renderTargetA.texture;
    this.compositeMat.uniforms.tBloom.value = this.bloomTarget.texture;
    this.compositeMat.uniforms.uBloomStrength.value = this.bloomStrength;
    this.compositeMat.uniforms.uChromaticStrength.value = this.chromaticStrength;
    this.compositeMat.uniforms.uDistortionStrength.value = this.distortionStrength;
    this.compositeMat.uniforms.uVignetteStrength.value = this.vignetteStrength;
    this.compositeMat.uniforms.uTime.value = this.time;
    
    this.renderer.setRenderTarget(currentRT);
    this.renderer.render(this.compositeScene, this.orthoCamera);
  }

  dispose() {
    window.removeEventListener('resize', this.resizeHandler);
    
    if (this.renderTargetA) this.renderTargetA.dispose();
    if (this.renderTargetB) this.renderTargetB.dispose();
    if (this.bloomTarget) this.bloomTarget.dispose();
    if (this.bloomBlurTarget) this.bloomBlurTarget.dispose();
    
    if (this.quadGeo) this.quadGeo.dispose();
    if (this.bloomExtractMat) this.bloomExtractMat.dispose();
    if (this.blurMat) this.blurMat.dispose();
    if (this.compositeMat) this.compositeMat.dispose();
  }
}
