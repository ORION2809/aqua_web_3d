# Aurora Aqua - Implementation Summary

## Project Overview

**Aurora Aqua** is a **futuristic, experiential 3D product site** for an Indian fish farming brand. This is NOT a website with a 3D background — it's an immersive experience where **the 3D scene IS the primary interface** and DOM elements are secondary, floating overlays.

### Design Philosophy
- **Scene dominates each page** — 3D is the hero, not decoration
- **Bold camera movement** — Camera passes THROUGH geometry, not around it
- **Water as medium** — Not a surface texture, but an environment to traverse
- **Irreversible visual moments** — One-time visual events that mark progression
- **Reduced DOM dominance** — Text floats, doesn't stack
- **Cinematic first impression** — The website DROWNS, not scrolls

---

## 🎬 THE CINEMATIC HOME EXPERIENCE (NEW)

### Overview: 15-Second Unforgettable Sequence

The Home page is not a hero section. It's a **cinematic event** that makes the user say:

> "Whoa... what just happened?"

The website does not start underwater. **The website DROWNS.**

### Timeline Breakdown

| Time | Phase | User Psychology | Technical Implementation |
|------|-------|-----------------|--------------------------|
| 0-2s | **ARRIVAL** | "This is calm... too calm." | Mirror-like water, tight FOV, subtle drift |
| 2-5s | **TENSION** | "Something is wrong." | Ripples build, camera approaches, UI fades |
| 5-7s | **ILLEGAL MOMENT** | "What the hell just happened?" | DOM violation, water rupture, darkness |
| 7-11s | **DESCENT** | "I'm inside it now." | Smooth descent, particles, light shafts |
| 11-15s | **CLAIM** | "This site owns me." | Underwater UI, controls restored |

---

### Phase 0: PRECONDITION (Before Animation)

**Purpose:** Lock all user input. This must feel non-interactive.

```javascript
// Lock reality
document.body.classList.add('lock-scroll', 'cinematic-mode');

// Hide all hero content
gsap.set('.hero__content', { opacity: 0, y: 30 });
gsap.set('.hero__tag', { opacity: 0 });
gsap.set('.hero__title-word', { opacity: 0, y: 100 });

// Stop Lenis
window.dispatchEvent(new CustomEvent('lockScroll'));
```

**CSS Classes Applied:**
- `.lock-scroll` — `overflow: hidden; position: fixed; height: 100vh;`
- `.cinematic-mode` — Header opacity 0.3, vignette overlay

---

### Phase 1: ARRIVAL (0s → 2s)

**Camera Setup:**
```javascript
camera.position.set(0, 120, 160);
camera.lookAt(0, 0, 0);
camera.fov = 35; // Tight, cinematic FOV
```

**Scene State:**
- Water surface: Almost mirror-like, minimal waves
- NO particles visible
- NO fog
- Clean, minimal lighting

**Motion:**
```javascript
// Extremely slow camera drift
camera.position.y = 120 + Math.sin(time * 0.2) * 0.3;
```

**UI Animation:**
```javascript
gsap.to('.hero__content', {
  opacity: 1, y: 0,
  duration: 1.5,
  ease: 'power2.out'
}, 0.5);
```

---

### Phase 2: TENSION BUILD (2s → 5s)

**Water Shader Tension:**
```glsl
// Vertex shader - tension builds
float tensionWave = sin(pos.x * 0.05 + uTime * 1.5) * 2.0 * uPhase;
tensionWave += sin(pos.y * 0.04 + uTime * 1.2) * 1.5 * uPhase;
pos.z = mix(calmWave, tensionWave, uPhase);
```

```glsl
// Fragment shader - light pulse off-rhythm
float pulse = sin(uTime * 3.7) * 0.5 + 0.5;
color *= 1.0 + pulse * 0.1 * uPhase;
```

**Camera Movement:**
```javascript
gsap.to(camera.position, {
  z: 90,           // Approaches water
  duration: 3,
  ease: 'power1.inOut'
}, 2);
```

**UI Degradation:**
```javascript
// User feels loss of control
gsap.to('.hero__content', { opacity: 0.4, duration: 2 }, 3);
document.body.classList.add('hide-cursor');
```

---

### Phase 3: THE ILLEGAL MOMENT (5s → 7s) ⚠️

**THIS IS THE SIGNATURE MOMENT. THE RULE BEING BROKEN:**

> A website must never physically overpower its UI.

**We violate this.**

#### T = 5.0s — Lock Harder
```javascript
document.body.classList.add('no-pointer');
// All pointer events disabled
// All keyboard input disabled
// Scroll completely locked
```

#### T = 5.1s — Camera LUNGE
```javascript
gsap.to(camera.position, {
  z: 20,
  y: 30,
  duration: 0.4,
  ease: 'power4.in'  // Intentionally aggressive
});
```

#### T = 5.4s — Canvas VIOLATES DOM Hierarchy
```javascript
// THE ILLEGAL LINE
document.querySelector('.canvas-container').style.zIndex = '999';
```

**This is intentional.** The canvas comes IN FRONT of the UI. This should never happen. That's the point.

#### T = 5.5s — Surface RUPTURE
```javascript
gsap.to(waterMaterial.uniforms.uRupture, {
  value: 1,
  duration: 0.5,
  ease: 'power2.in'
});
```

```glsl
// Vertex shader - water collapses
pos.z -= uRupture * 25.0;
```

#### T = 5.8s — Camera Crosses Plane (NO EASING)
```javascript
// This MUST feel wrong
camera.position.y = -10;
// No gsap. No tween. Instant.
```

#### T = 6.0s — UI DROWNS
```javascript
// Text SINKS, not fades
gsap.to('.hero__content', {
  y: 80,
  opacity: 0,
  duration: 0.3,
  ease: 'power2.in'
});
```

#### T = 6.3s — Darkness Hit
```javascript
// Sudden fog
scene.fog = new THREE.FogExp2(0x021020, 0.015);
renderer.toneMappingExposure = 0.6;

// Underwater light activates
underwaterLight.intensity = 1.5;
```

#### T = 6.8s — Surface Breach Event
```javascript
window.dispatchEvent(new CustomEvent('surfaceBreach'));
document.body.classList.add('surface-breached');
```

---

### Phase 4: DESCENT (7s → 11s)

**Camera Descent:**
```javascript
gsap.to(camera.position, {
  y: -160,
  z: 60,
  duration: 4,
  ease: 'power1.out'  // Everything glides now
});
```

**Particles Fade In:**
```javascript
gsap.to(particles.material, { opacity: 0.6, duration: 2 }, 7.5);
```

- 2000 particles (high), 1000 (medium), 500 (low)
- Slow upward drift
- Gentle horizontal sway

**Light Shafts Appear:**
```javascript
lightShafts.forEach((shaft, i) => {
  gsap.to(shaft.material, { opacity: 0.15, duration: 1.5 }, 7.5 + i * 0.3);
});
```

- 5 volumetric cylinders
- Additive blending
- Subtle rotation animation

**Depth Rings Pass By:**
```javascript
depthRings.forEach((ring, i) => {
  gsap.to(ring.material, { opacity: 0.3, duration: 0.5 }, 8 + i * 0.8);
});
```

---

### Phase 5: CLAIM (11s → 15s)

**Camera Settles:**
```javascript
gsap.to(camera.position, {
  y: -120, z: 50,
  duration: 3,
  ease: 'power2.out'
});
```

**Canvas Z-Index Restored:**
```javascript
document.querySelector('.canvas-container').style.zIndex = '1';
```

**Underwater Mode Activated:**
```javascript
document.body.classList.add('underwater-mode');
```

**UI Returns (But Changed):**
```javascript
gsap.to('.hero__content', {
  opacity: 1,
  duration: 1.5,
  ease: 'power2.out'
});
```

**Controls Unlocked:**
```javascript
document.body.classList.remove('lock-scroll', 'no-pointer', 'hide-cursor');
window.dispatchEvent(new CustomEvent('unlockScroll'));
window.dispatchEvent(new CustomEvent('cinematicComplete'));
```

---

### Water Surface Shader (Complete)

```glsl
// VERTEX SHADER
uniform float uTime;
uniform float uPhase;    // 0=calm, 1=tension
uniform float uRupture;  // 0=normal, 1=collapsed

varying vec2 vUv;
varying float vElevation;

void main() {
  vUv = uv;
  vec3 pos = position;
  
  // Phase 0-1: Mirror-like
  float calmWave = sin(pos.x * 0.01 + uTime * 0.3) * 0.5;
  calmWave += sin(pos.y * 0.01 + uTime * 0.2) * 0.3;
  
  // Phase 2: Tension ripples
  float tensionWave = sin(pos.x * 0.05 + uTime * 1.5) * 2.0 * uPhase;
  tensionWave += sin(pos.y * 0.04 + uTime * 1.2) * 1.5 * uPhase;
  
  pos.z = mix(calmWave, tensionWave, uPhase);
  
  // RUPTURE: Collapse
  pos.z -= uRupture * 25.0;
  
  vElevation = pos.z;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
```

```glsl
// FRAGMENT SHADER
uniform float uTime;
uniform float uPhase;
uniform vec3 uColorDeep;      // #041e42
uniform vec3 uColorSurface;   // #0a4a6e
uniform vec3 uColorHighlight; // #67e8f9

varying vec2 vUv;
varying float vElevation;

void main() {
  float distFromCenter = length(vUv - 0.5);
  vec3 color = mix(uColorSurface, uColorDeep, distFromCenter * 1.5);
  
  // Reflection highlights
  float highlight = smoothstep(-0.5, 2.0, vElevation);
  color = mix(color, uColorHighlight, highlight * 0.15);
  
  // Off-rhythm pulse during tension
  float pulse = sin(uTime * 3.7) * 0.5 + 0.5;
  color *= 1.0 + pulse * 0.1 * uPhase;
  
  gl_FragColor = vec4(color, 0.95);
}
```

---

### CSS Classes for Cinematic Mode

```css
/* Lock all scrolling */
.lock-scroll {
  overflow: hidden !important;
  height: 100vh !important;
  position: fixed !important;
  width: 100% !important;
}

/* Cinematic mode - minimal UI */
.cinematic-mode .header {
  opacity: 0.3;
}

/* Hide cursor during tension */
.hide-cursor, .hide-cursor * {
  cursor: none !important;
}

/* Disable all pointer events */
.no-pointer, .no-pointer * {
  pointer-events: none !important;
}

/* Underwater mode - the new reality */
.underwater-mode .hero__content {
  background: rgba(2, 16, 32, 0.6);
  backdrop-filter: blur(16px);
  padding: var(--space-8);
  border-radius: var(--radius-xl);
  border: 1px solid rgba(34, 211, 238, 0.2);
}

.underwater-mode .hero__title {
  font-size: var(--text-4xl);
  text-shadow: 0 0 40px rgba(34, 211, 238, 0.3);
}
```

---

### CustomEvents Dispatched

| Event | Time | Purpose |
|-------|------|---------|
| `lockScroll` | 0.0s | Tells Lenis to stop |
| `surfaceBreach` | 6.8s | Narrative marker - user has entered underwater |
| `unlockScroll` | 14.5s | Tells Lenis to resume |
| `cinematicComplete` | 14.5s | Signals sequence is done |

---

### Why This Works

✅ **Broke DOM/Canvas hierarchy** — Canvas z-index 999 during breach  
✅ **Violated scroll expectations** — User cannot scroll for 14.5 seconds  
✅ **Forced non-interactive cinematic** — No input accepted  
✅ **Created shock moment** — Camera lunge + rupture + instant position change  
✅ **Changed visual rules permanently** — Underwater mode persists  
✅ **Made site impossible to mistake for template** — No one forgets this  

---

### Success Metric

If someone opens the site and says:
> "Whoa... what just happened?"

**You won.**

If they say:
> "Nice hero animation."

**You failed.**

---

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Vite | ^5.0.10 | Build tool & dev server |
| Three.js | ^0.160.0 | WebGL 3D rendering |
| GSAP | ^3.12.4 | Animations & ScrollTrigger |
| Lenis | ^1.0.42 | Smooth scrolling |
| Barba.js | ^2.9.7 | Page transitions |

---

## Project Structure

```
aurora-aqua/
├── index.html                 # Home page
├── about.html                 # About page
├── services.html              # Services page
├── contact.html               # Contact page
├── vite.config.js             # Vite multi-page config
├── package.json               # Dependencies
├── public/                    # Static assets
│   └── assets/
│       ├── textures/
│       └── hdr/
└── src/
    ├── styles/
    │   └── main.css           # Complete design system (~2300 lines)
    └── js/
        ├── main.js            # Application entry point
        ├── lenis.js           # Smooth scroll with ScrollTrigger sync
        ├── barba.js           # Page transitions
        ├── animations.js      # GSAP animations
        ├── navigation.js      # Header & mobile menu
        ├── cursor.js          # Custom cursor
        ├── loader.js          # Loading animation
        ├── form.js            # Contact form handling
        ├── utils/
        │   └── device.js      # Device detection & performance tiers
        ├── three/
        │   ├── SceneManager.js      # Core Three.js management
        │   ├── WaterSurface.js      # Procedural water shader
        │   ├── ParticleSystem.js    # GPU particle system
        │   ├── LightingSetup.js     # Underwater lighting
        │   └── AbstractGeometry.js  # Procedural 3D shapes
        └── scenes/
            ├── HomeScene.js         # Underwater environment
            ├── AboutScene.js        # Scroll-driven journey
            ├── ServicesScene.js     # Morphing central object
            └── ContactScene.js      # Minimal wave background
```

---

## Core Implementations

### 1. SceneManager.js (Critical)

The backbone of all 3D scenes. Handles the complete Three.js lifecycle.

**Features Implemented:**
- WebGL renderer with alpha transparency
- Perspective camera with configurable FOV
- Exponential fog for underwater depth effect
- Animation loop with RAF (requestAnimationFrame)
- Object registration system with update callbacks
- Complete disposal with memory leak prevention
- Resize handling with DPR limits

**Key Code Patterns:**

```javascript
// Renderer setup with performance optimization
this.renderer = new THREE.WebGLRenderer({
  antialias: !mobile,           // Disable AA on mobile
  alpha: true,                  // Transparent background
  powerPreference: mobile ? 'low-power' : 'high-performance',
  stencil: false,
  depth: true,
});

// Color management
this.renderer.outputColorSpace = THREE.SRGBColorSpace;
this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
this.renderer.toneMappingExposure = 1.2;
```

**Lifecycle Methods:**
- `start()` - Begin animation loop
- `stop()` - Pause animation loop
- `dispose()` - Complete cleanup with texture/material disposal
- `addObject(obj)` - Register renderable with auto-update
- `onUpdate(callback)` - Subscribe to render loop

---

### 2. WaterSurface.js (Critical)

Procedural water surface shader creating the underwater ceiling effect.

**Shader Features:**
- Multi-octave simplex noise for wave simulation
- Dynamic normal calculation for lighting
- Fresnel effect for edge glow
- Caustic-like shimmer animation
- Mouse interaction (desktop only)

**Vertex Shader Highlights:**
```glsl
// Multi-layer wave simulation
float wave1 = snoise(vec3(pos.x * freq, pos.y * freq, time * 0.5)) * amplitude;
float wave2 = snoise(vec3(pos.x * freq * 2.0, pos.y * freq * 2.0, time * 0.7)) * amplitude * 0.5;
float wave3 = snoise(vec3(pos.x * freq * 4.0, pos.y * freq * 4.0, time * 0.3)) * amplitude * 0.25;
```

**Fragment Shader Highlights:**
```glsl
// Caustic shimmer effect
float caustic = sin(vUv.x * 40.0 + uTime) * sin(vUv.y * 40.0 + uTime * 0.7) * 0.5 + 0.5;
caustic = pow(caustic, 3.0) * 0.15;
color += vec3(caustic) * uColorHighlight;
```

**Performance Tiers:**
- Low: 48 segments
- Medium: 80 segments  
- High: 128 segments

---

### 3. ParticleSystem.js

GPU-accelerated floating particles for underwater atmosphere.

**Features:**
- Custom ShaderMaterial with vertex colors
- Random animation offsets per particle
- Additive blending for glow effect
- Depth-based opacity falloff
- Spiral motion patterns

**Particle Counts by Performance Tier:**
- Low: 400 particles
- Medium: 1,200 particles
- High: 2,500 particles

**Shader Features:**
```glsl
// Floating animation with variation
pos.y += sin(time * (0.5 + aRandom.x * 0.5) + aRandom.y * 6.28) * (1.0 + aRandom.z * 2.0);
pos.x += sin(time * 0.3 + aRandom.z * 6.28) * (0.5 + aRandom.w * 1.5);

// Soft glow with inner brightness
float innerGlow = 1.0 - smoothstep(0.0, 0.25, dist);
color += innerGlow * 0.5;
```

---

### 4. LightingSetup.js

Underwater lighting system for aquatic atmosphere.

**Light Configuration:**
| Light Type | Color | Intensity | Purpose |
|------------|-------|-----------|---------|
| Ambient | #0891b2 | 0.5 | Base underwater glow |
| Directional (Main) | #67e8f9 | 0.8 | Surface light |
| Directional (Fill) | #22d3ee | 0.4 | Shadow fill |
| Directional (Rim) | #a5f3fc | 0.3 | Edge highlights |
| Point Light 1 | #22d3ee | 1.0 | Caustic glow |
| Point Light 2 | #0891b2 | 0.7 | Depth accent |
| Point Light 3 | #67e8f9 | 0.5 | Caustic simulation |

**Animated Properties:**
- Main light intensity oscillation
- Point lights position drift

---

### 5. Scene Implementations — EXPERIENTIAL DESIGN

---

#### HomeScene.js — OVERWHELMING UNDERWATER EXPERIENCE
**Purpose:** Complete sensory immersion with surface breach mechanic

**The Journey (4 Phases):**
1. **Above Water** (y=100): User starts ABOVE the ocean surface, looking down
2. **Surface Breach** (y=50): Camera PASSES THROUGH water surface — irreversible moment
3. **Descent** (y=0 to -100): Descending through blue depths with god rays
4. **Abyss** (y=-180): Deep ocean reveal with glowing core structures

**Key Features:**
- `hasBreachedSurface` state flag — irreversible visual moment
- God rays (4 volumetric light shafts)
- Massive depth markers (floating rings at intervals)
- Abyss core reveal with pulsing glow
- Camera passes THROUGH water plane (not around)
- Bold mouse parallax (30px X, 18px Y movement)
- Fog density increases with depth
- CustomEvents: `surfaceBreach`, `underwaterEntry`

**Camera Path:**
```javascript
// 4-phase camera journey
Phase 1: y=100, z=80  → Above water, gazing at surface
Phase 2: y=50         → BREACH moment (crosses water plane)
Phase 3: y=0 to -100  → Underwater descent with roll
Phase 4: y=-180       → Abyss arrival, structures reveal
```

---

#### AboutScene.js — VERTICAL DESCENT THROUGH MEANING
**Purpose:** Story unfolds as user descends through collapsing layers

**The Journey (4 Story Layers):**
1. **Origin** (y=80): Crystalline sphere — where it began
2. **Growth** (y=20): Organic coral formation — evolution
3. **Technology** (y=-40): DNA helix structure — innovation
4. **Vision** (y=-100): Glowing destination core — the future

**Irreversible Moment: LAYER COLLAPSE**
- When camera passes a layer, it collapses and fades
- Cannot be undone — marks narrative progression
- Layers visually "sink" as user descends

**Key Features:**
- Camera roll during descent (±5° rotation)
- Layer collapse animation with GSAP
- Destination reveal at bottom
- CustomEvents: `layerCollapsed`, `visionReached`

**Camera Path:**
```javascript
// Vertical descent with roll
Start: y=100, rotation.z = 0
Layer pass: rotation.z oscillates ±0.08
End: y=-120, destination reveals with scale animation
```

---

#### ServicesScene.js — CENTRAL OBJECT AS VISUAL ANCHOR
**Purpose:** One dominant geometry that the page orbits around

**The Experience:**
- Massive central TorusKnot dominates viewport
- Camera ORBITS the geometry (not just looks at it)
- Geometry MORPHS when services are scrolled to
- Inner pulsing core + outer translucent shell

**5 Service Geometries (Morphing):**
1. TorusKnot — default (consulting)
2. Icosahedron — research
3. Octahedron — engineering
4. Torus — operations
5. DodecahedronGeometry — sustainability

**Key Features:**
- Orbiting camera (radius 25, speed 0.15)
- Elastic geometry morphing (GSAP `elastic.out`)
- Inner core pulse animation
- Section observer for scroll-triggered morphs
- CustomEvents: `serviceChange`

---

#### ContactScene.js — CALM AFTER THE STORM
**Purpose:** Resolution and peace after the intensity

**The Experience:**
- Vast, calm ocean at twilight
- Camera floats gently above still water
- Stars fade in gradually (irreversible reveal)
- Bioluminescent lights rise from depths
- Sense of arrival and completion

**Key Features:**
- Infinite calm ocean with gentle shader waves
- Twilight horizon glow (sunset remnant)
- 2000 stars that fade in after 1.5s delay
- Rising bioluminescent orbs from depths
- Ambient floating particles
- Very subtle camera sway
- CustomEvents: `starsRevealed`, `peaceReached`

**Camera:**
```javascript
Position: y=15, z=80 (floating above calm water)
Gentle sway: ±0.5 units based on time
Mouse parallax: 8px X, 3px Y (subtle)
```

---

### 6. CustomEvents System (Experiential Hooks)

Scenes dispatch CustomEvents to allow DOM/CSS to react to 3D moments:

| Event | Scene | Trigger | Use Case |
|-------|-------|---------|----------|
| `surfaceBreach` | Home | Camera crosses water at y=50 | Add `surface-breached` class to body |
| `underwaterEntry` | Home | First descent begins | Darken header background |
| `layerCollapsed` | About | Passing a story layer | Animate DOM sections |
| `visionReached` | About | Reached final destination | Reveal CTA |
| `serviceChange` | Services | Geometry morph triggered | Highlight active service |
| `starsRevealed` | Contact | Stars fade in complete | Add peace mode styling |
| `peaceReached` | Contact | Tranquility state achieved | Enable calm UI mode |

**Usage in main.js:**
```javascript
window.addEventListener('surfaceBreach', () => {
  document.body.classList.add('surface-breached');
});

window.addEventListener('peaceReached', () => {
  document.body.classList.add('peace-mode');
});
```

---

### 7. Device Detection & Performance

**device.js Utilities:**

```javascript
// Device detection
isMobile()           // UA string + viewport check
isTablet()           // iPad/Android tablet detection
isTouch()            // Touch capability check
supportsWebGL()      // WebGL availability

// Performance
getDevicePixelRatio() // Capped: mobile=1.5, desktop=2
getPerformanceTier()  // Returns: 'low' | 'medium' | 'high'
```

**Performance Tier Logic:**
```javascript
if (mobile || memory <= 2 || cores <= 2) return 'low';
if (memory <= 4 || cores <= 4) return 'medium';
return 'high';
```

---

### 8. Smooth Scroll (Lenis)

**Configuration:**
```javascript
new Lenis({
  duration: isMobile() ? 1 : 1.2,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smooth: true,
  smoothTouch: false,  // Native scroll on touch
  mouseMultiplier: 1,
  touchMultiplier: 2,
});
```

**ScrollTrigger Integration:**
```javascript
this.lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => this.lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);
```

---

### 8. Page Transitions (Barba.js)

**Transition Types:**

1. **Default Transition:**
   - Fade out current page
   - Overlay wipe animation
   - Fade in new page

2. **Water Wipe Transition (from Home):**
   - Scale + blur effect on leave
   - More dramatic overlay timing

**Scene Lifecycle Integration:**
```javascript
onBeforeLeave: () => {
  this.currentScene.pause();
  this.smoothScroll.stop();
},
onLeave: () => {
  this.animations.destroy();
  this.currentScene.destroy();
},
onEnter: () => {
  this.initializeScene();
},
onAfterEnter: () => {
  this.smoothScroll.start();
  this.animations.initPageAnimations();
}
```

---

### 9. CSS Design System

**Color Palette (Ocean Blue Theme):**
```css
--color-deep-blue: #041e42;
--color-ocean-blue: #0a3d62;
--color-navy: #0c4a6e;
--color-teal: #0891b2;
--color-aqua: #22d3ee;
--color-cyan: #a5f3fc;
```

**Gradients:**
```css
--gradient-ocean: linear-gradient(180deg, #041e42 0%, #0a3d62 30%, #0c4a6e 60%, #0891b2 100%);
--gradient-card: linear-gradient(180deg, rgba(10, 61, 98, 0.6) 0%, rgba(4, 30, 66, 0.8) 100%);
--gradient-glass: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.02) 100%);
```

**Canvas Container:**
```css
.canvas-container {
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
}
```

---

### 10. Main Application Flow

**Initialization Sequence:**
1. Create Loader with callback
2. Preload images and fonts
3. On load complete:
   - Initialize SmoothScroll (Lenis)
   - Initialize Navigation
   - Initialize CustomCursor
   - Initialize Animations → `initPageAnimations()`
   - Initialize Form (if contact page)
   - Initialize 3D Scene → `start()`
   - Initialize Barba transitions

**Scene Selection:**
```javascript
switch (namespace) {
  case 'home':    return new HomeScene(container);
  case 'about':   return new AboutScene(container);
  case 'services': return new ServicesScene(container);
  case 'contact': return new ContactScene(container);
  default:        return new HomeScene(container);
}
```

---

## Bug Fixes Applied

### 1. ServicesScene & ContactScene Auto-Start
**Problem:** Scenes were calling `this.sceneManager.start()` inside `init()`, causing double initialization.

**Fix:** Removed premature `start()` call from `init()`. Scenes now start only when `scene.start()` is called from main.js.

### 2. Animations Initialization
**Problem:** `animations.init()` was called, which only created an empty GSAP context.

**Fix:** Changed to call `animations.initPageAnimations()` which actually sets up all scroll triggers and text animations.

### 3. CSS Loading Order
**Problem:** CSS was being loaded both via HTML `<link>` and via JavaScript import, causing conflicts.

**Fix:** Removed direct CSS links from HTML, added critical inline CSS for immediate display.

### 4. SceneManager Missing
**Problem:** SceneManager.js file was deleted/missing from the filesystem.

**Fix:** Recreated complete SceneManager.js with all features.

---

## Performance Optimizations

### Mobile Optimizations
- Disable antialiasing
- Reduce particle count (400 vs 2500)
- Lower water surface segments (48 vs 128)
- Disable mouse interaction
- Skip secondary particle layers
- Lower pixel ratio cap (1.5 vs 2.0)
- Use `powerPreference: 'low-power'`

### Memory Management
- Dispose geometries on scene destroy
- Dispose materials and textures
- Cancel RAF loops cleanly
- Remove event listeners
- Clear object arrays
- Force WebGL context loss on dispose

### Rendering
- Transparent scene background (CSS handles gradient)
- Depth write disabled for particles
- No shadows (disabled for performance)
- Capped delta time to prevent jumps

---

## Files Modified/Created

| File | Action | Changes |
|------|--------|---------|
| `src/js/three/SceneManager.js` | Created | Full implementation |
| `src/js/three/WaterSurface.js` | Modified | Enhanced shaders, caustics |
| `src/js/three/ParticleSystem.js` | Modified | Performance tiers, better glow |
| `src/js/scenes/HomeScene.js` | Modified | Performance tiers, logging |
| `src/js/scenes/ServicesScene.js` | Modified | Removed auto-start |
| `src/js/scenes/ContactScene.js` | Modified | Added animateIn, removed auto-start |
| `src/js/main.js` | Modified | Fixed animations init |
| `index.html` | Modified | Added critical inline CSS |
| `about.html` | Modified | Added critical inline CSS |
| `services.html` | Modified | Added critical inline CSS |
| `contact.html` | Modified | Added critical inline CSS |

---

## Running the Project

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

**Dev Server:** http://localhost:5173

---

## Visual Quality Achieved

✅ Calm, underwater atmosphere
✅ Floating particles with glow
✅ Animated water surface above camera
✅ Smooth scroll with Lenis
✅ Page transitions with Barba
✅ Mouse parallax on desktop
✅ Scroll-driven camera movement
✅ Premium ocean-blue color scheme
✅ Glass-morphism UI elements
✅ Responsive design

---

## Console Logging (Debug)

The implementation includes strategic logging:
```
🌊 Aurora Aqua Initializing...
🌊 Load complete, initializing...
🎬 SceneManager: Initializing... { performanceTier: 'high' }
✅ SceneManager: Initialized successfully
🏠 HomeScene: Creating... { tier: 'high' }
✅ HomeScene: Initialized
▶️ SceneManager: Starting render loop
🌊 3D Scene started!
🌊 Aurora Aqua Ready!
```

---

## Future Enhancements (Not Implemented)

- HDRI environment lighting
- Fish 3D model (desktop only)
- Post-processing effects (bloom, depth of field)
- Audio ambient sounds
- WebGL 2.0 specific features
- Texture-based water normals

---

*Implementation completed: February 7, 2026*
