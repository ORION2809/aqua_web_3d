# Aurora Aqua — Comprehensive Change Documentation

## From: Original Implementation Plan → Current User-Centric Build

This document covers every architectural and behavioral change made to Aurora Aqua, transforming it from a system-centric animated website into a **user-intent-driven immersive experience**.

---

## Table of Contents

0. [Act 1 v3 — "Dolphin Apex → Descent → Splash"](#0-act-1-v3--dolphin-apex--descent--splash)
1. [Act 1 v2 — "The Drop" (superseded)](#1-act-1-redesign--the-drop)
2. [User Intent System (REQ 1)](#2-user-intent-system-req-1)
3. [Fuzzy Spatial World (REQ 2)](#3-fuzzy-spatial-world-req-2)
4. [Creature Agency (REQ 3)](#4-creature-agency-req-3)
5. [Perception Shift Events (REQ 4)](#5-perception-shift-events-req-4)
6. [State-Based Object Interactivity (REQ 5)](#6-state-based-object-interactivity-req-5)
7. [Emotional Progression Arc (REQ 6)](#7-emotional-progression-arc-req-6)
8. [Services Scene Integration](#8-services-scene-integration)
9. [File-by-File Summary](#9-file-by-file-summary)

---

## 0. Act 1 v3 — "Dolphin Apex → Descent → Splash"

### Supersedes: "The Drop" (v2)

**Design Intent:** You are seeing the world through a dolphin's eyes at the apex of a jump. Weightless suspension. Then gravity claims you. The descent is physical. The splash is violent. Submersion is total. *If it feels like "just a cool intro animation," it is wrong.*

### Timeline (7.5 seconds total)

| Phase | Time | Camera | Effect |
|---|---|---|---|
| **1. Stillness** | 0.0–0.6s | `(0, 120, 160)` FOV 38. Micro-oscillation. | Suspended anticipation. Particles hidden. Canvas z=9999. |
| **2. Peak Pause** | 0.6–2.0s | Weightless drift at apex. | Over-exposure bleeds (`+0.12` peak). Specular shimmer. Exposure 1.3. |
| **3. Descent** | 2.0–4.0s | CatmullRom path 0→60%. `power2.in`. | LookAt tracks ahead of motion. Over-exposure clears. Exposure normalizes. |
| **4. Acceleration** | 4.0–5.2s | Path 60→95%. `power4.in`. | FOV widens to 58 (vertigo). Water goes violent. Terminal velocity. |
| **5. Splash** | 5.2–6.2s | Snap to `(0, -10, 60)`. `power2.out`. | `triggerSplash(0.5, 0.5, 1.5)` + `spike(3.5, 0.8)`. Water ruptures. FOV snaps to 28. |
| **6. Submersion** | 6.2–7.5s | Descend to `y:-40`. `power1.out`. | Fog. Deep exposure 0.6. Particles appear. Light shafts. Act 2 begins. UI reentry at 7.5s. |

### Phase Names (animate())

Old: `arrival` → `tension` → `illegal` → `descent` → `claim` → `complete`
New: `apex` → `suspension` → `descent` → `acceleration` → `splash` → `submersion` → `complete`

### Files Modified

#### `PostProcessing.js`
- **4 new uniforms:** `uSplashTime` (float, -1 inactive), `uSplashStrength`, `uSplashCenter` (vec2), `uOverExposure`
- **Splash shockwave GLSL:** Exponential decay `exp(-t * 4.0)`, radial wave `sin(dist * 40.0 - t * 15.0)`, radial push via normalized direction, lateral tear `sin(uv.y * 30.0 + t * 12.0) * amp * 0.08`
- **Over-exposure GLSL:** `color += vec3(1.0, 0.98, 0.95) * uOverExposure` (warm blown-out highlights)
- **New methods:** `triggerSplash(x, y, strength)`, `setOverExposure(value)`
- **render() updated:** Splash timer auto-advances, auto-cleans after 2.0s

#### `HomeScene.js`
- **`createCamera()`:** Position `(0, 120, 160)`, FOV 38, `lookAt(0, 0, 0)`
- **`lockReality()`:** ALL UI elements hidden with `visibility: hidden` — no hero content during intro
- **`runCinematicTimeline()`:** Complete rewrite — 6-phase dolphin apex sequence (7.5s)
  - CatmullRom descent path with 6 control points
  - Separate CatmullRom look-ahead path (camera looks where it's going)
  - Over-exposure ramp via `setOverExposure()` during peak pause
  - `triggerSplash()` + `spike()` at impact
  - Smooth UI reentry at 7.5s (visibility → opacity fade)
- **`animate()`:** New `apex` (micro-oscillation) and `suspension` (weightless drift) phase handlers
- **Act 2 guard:** Changed from `descent|claim|complete` to `submersion|complete`

### Design Criteria
> "Does someone unfamiliar with the site think: 'This is not a website intro — this is monumental?'"

---

## 1. Act 1 Redesign — "The Drop"

### Previous Implementation
The original Act 1 ("The Drowning") used a **micro-to-macro scale reveal**:
- Camera started **underwater** at `(0, -20, 8)` — a claustrophobic micro-particle view
- It pulled back to `(0, 120, 160)` to reveal the ocean surface from above (0s → 2s)
- Tension phase built wave agitation (2s → 5s)
- "Illegal moment" at 5s — camera zoomed to the surface and punched through
- Descent to underwater Act 2 position (7s → 11s)
- UI restored and scroll unlocked (11s → 15s)
- **Total duration: ~15 seconds**

### Current Implementation — "The Drop"
The new Act 1 feels like **being dropped from above the ocean surface into the water**:

| Phase | Time | What Happens |
|-------|------|--------------|
| **Stillness Above** | 0s → 2s | Camera starts at `(0, 120, 80)` ABOVE the ocean, looking down at the water surface. The user sees waves spread out below. Hero content fades in. A moment of calm. |
| **The Pull** | 2s → 3.8s | The water gets agitated. Camera accelerates downward with `power3.in` easing — starts slow, then YANKS like gravity taking hold. FOV widens for vertigo. Hero content destabilizes. |
| **Surface Impact** | 3.8s → 4.5s | Camera SMASHES through the surface at `y: -15`. PP spike (3.0 intensity). Centered ripple at impact point. Water mesh ruptures. FOV snaps back. Hero content ripped away. |
| **Sinking** | 4.5s → 7s | Underwater fog activates. Camera decelerates (water resistance) to Act 2 position `(0, -40, 60)`. Particles fade in as marine snow. Light shafts appear from above. Camera rotation stabilizes. |
| **Settling** | 7s → 9s | UI re-emerges. Underwater-mode CSS applied. Scroll unlocks. Phase = complete. |
| **Total duration: ~9 seconds** (reduced from 15s) | | |

### Key Differences
| Aspect | Before | After |
|--------|--------|-------|
| Camera start | Underwater micro `(0, -20, 8)` | Above surface `(0, 120, 80)` |
| Motion direction | Pull-back then re-submerge | Single continuous downward plunge |
| Surface breach | Approached from same level | Camera falls THROUGH from above |
| FOV manipulation | None | Widens during pull (vertigo), snaps back on impact |
| PP effects at breach | `spike(2.0, 0.8)` | `spike(3.0, 0.6)` + `triggerRipple(0.5, 0.5)` centered impact |
| Duration | 15 seconds | 9 seconds |
| Feeling | "Pulled into water from beside it" | "Dropped from above, gravity takes you" |

### Files Changed
- `src/js/scenes/HomeScene.js` — `createCamera()`, `runCinematicTimeline()`, `animate()` arrival phase

---

## 2. User Intent System (REQ 1)

### Previous Implementation
All behavior was **system-centric**:
- Creatures orbited on sine waves with fixed parameters
- Camera lerp was constant (0.05)
- Zone transitions snapped instantly based on scroll thresholds
- Light beams animated on their own timers
- Everything ran on `elapsed` time, not user behavior

### Current Implementation
A new **`UserIntent.js` singleton** reads the user's body language through input signals and exposes semantic intent values that drive every system in both scenes.

### New File: `src/js/utils/UserIntent.js` (~364 lines)

#### Raw Input Tracking
| Signal | Source | How It's Read |
|--------|--------|---------------|
| Scroll velocity | `window.scroll` event | `_scrollVelocity` — pixels/second |
| Scroll acceleration | Derived from velocity delta | `_scrollAccel` |
| Direction changes | Sign change in scroll delta | `_scrollDirectionChanges` (decaying counter) |
| Mouse velocity | `mousemove` delta per frame | `_mouseVelocity` |
| Mouse idle time | Time since last `mousemove` | `_mouseIdleTime` |
| Click events | `mousedown` | Accelerates emotional phase |

#### Derived Intent Values (read by all systems)
| Value | Range | Meaning |
|-------|-------|---------|
| `rushFactor` | 0–1 | How fast the user is scrolling. 0 = still, 1 = rushing |
| `lingerFactor` | 0–1 | How long since last scroll. Saturates at 3s → 1.0 |
| `hesitationFactor` | 0–1 | Frequency of scroll direction changes (decaying) |
| `mouseIntensity` | 0–1 | Mouse movement speed. 0 = still, 1 = rapid |
| `cursorDwelling` | bool | Cursor still for > 1.2 seconds |
| `cursorDwellPosition` | {x, y} | Normalized screen position of dwell |
| `cursorDwellDuration` | seconds | Duration of current dwell |
| `explorationRhythm` | -1 to +1 | -1 = pure rushing, 0 = balanced, +1 = pure contemplation |
| `timeScale` | 0.3–2.0 | Temporal distortion. Rushing = faster time, lingering = slower |

#### Zone Gate System
```
requestZoneTransition() → boolean
```
- If `rushFactor > 0.4`, the gate **locks** — the zone refuses to change
- User must pause (`rushFactor < 0.15` AND `lingerFactor > 0.3` for 0.4s) to unlock
- Creates felt resistance: the world won't let you rush through it

---

## 3. Fuzzy Spatial World (REQ 2)

### Previous Implementation
Zone transitions were **instant snaps**:
- Scroll crossed threshold → `setZone('twilight')` → immediate fog/lighting/PP change
- No blending between zones
- Camera strictly on-spline at all times
- No autonomous movement when user paused

### Current Implementation

#### Fuzzy Zone Blending (`updateFuzzyZones()`)
- Zone boundaries **blend continuously** over time (not instant)
- `zoneBlend` value (0–1) interpolates fog color, exposure, and background gradient between current and pending zones
- Transition is **gated by user rhythm** — rushing locks the gate, pausing opens it
- During blend: fog color, tone mapping exposure, and PP background gradient all interpolate

#### Idle Drift
- When `lingerFactor > 0`, the camera drifts **off-spline**:
  ```
  idleDrift.x = sin(time * 0.13) * 3 * linger
  idleDrift.y = sin(time * 0.09) * 1.5 * linger
  idleDrift.z = cos(time * 0.11) * 2 * linger
  ```
- The world breathes even when the user doesn't scroll
- Camera lerp speed is also intent-driven: rushing = 0.13 (snappy), lingering = 0.02 (dreamy)

### Files Changed
- `src/js/scenes/HomeScene.js` — new `updateFuzzyZones()`, `applyZoneAtmosphere()` methods, `animate()` camera section

---

## 4. Creature Agency (REQ 3)

### Previous Implementation
Fish had **one behavior**: orbit around school centers with flee response:
- `updateCreatures(time)` — single parameter, fixed orbit
- Flee from camera within `fleeRadius` — always same response
- No awareness of user behavior
- Body undulation at constant speed

### Current Implementation
Fish now have **moods** that respond to user intent:

#### Mood Determination
| User Behavior | Fish Mood | Behavior |
|---------------|-----------|----------|
| `rushFactor > 0.5` | **Territorial** | Fish scatter to DEEPER zones. School centers sink. Expanded flee radius (`fleeRadius × (1 + rush × 2)`). Downward bias on flee offset. |
| `lingerFactor > 0.6` + low hesitation | **Curious** | Fish approach and gather near camera. Maintain ~35 unit distance. Tighter school formation. |
| `guideFishUnlocked` + `lingerFactor > 0.7` | **Guiding** | First fish becomes a guide — leads ahead on the camera spline path. Glows brighter with pulsing emissive. |
| Default | **Neutral** | Standard flee behavior (original implementation) |

#### New Behaviors
- **Territorial**: School centers physically drift downward when user rushes (`schoolCenter.y` biased toward `-10`)
- **Curious**: Fish drift toward camera with smooth approach force, repel at approach distance to avoid clustering
- **Guiding**: Guide fish positions itself ahead on the camera path spline, weaving side-to-side. Emissive intensity `1.2 + sin(time * 3) * 0.3`
- **Body undulation speed**: Territorial = 5x, Curious = 1.5x, Neutral = 3x
- **Bioluminescent glow**: Enhanced by emotional phase — revelation phase adds +0.4 emissive

### Method Signature Change
```
Before: updateCreatures(time)
After:  updateCreatures(time, delta)
```

### Files Changed
- `src/js/scenes/HomeScene.js` — complete rewrite of `updateCreatures()`

---

## 5. Perception Shift Events (REQ 4)

### Previous Implementation
No perception shifts existed. The world had consistent physics throughout.

### Current Implementation

#### Gravity Inversion
- Triggered by **The Fracture** (designed instability event)
- When fracture fires, `userIntent.triggerPerceptionShift()` is called
- For ~4 seconds, the Y-axis partially inverts:
  ```
  invertPhase = sin(progress × π)  // 0→1→0 arc
  driftedPos.y = pathPos.y + (centerY - pathPos.y) × invertedGravityFactor × 2
  ```
- The surface appears to become the abyss, then returns
- After completion, `gravityInverted` resets to false

#### Temporal Distortion
- `userIntent.timeScale` ranges from 0.3 to 2.0
- Applied every frame: `delta = rawDelta * userIntent.timeScale`
- Rushing accelerates world time (everything moves faster)
- Lingering slows world time (everything becomes dreamlike)
- Affects: creature movement, depth object rotation, particle speed, signature object rotation

### Files Changed
- `src/js/utils/UserIntent.js` — `triggerPerceptionShift()`, `updatePerceptionShift(delta)`
- `src/js/scenes/HomeScene.js` — `animate()` perception shift section + camera gravity inversion

---

## 6. State-Based Object Interactivity (REQ 5)

### Previous Implementation
All objects auto-revealed based on camera proximity:
- Data glyphs: opacity = `(1 - distance/60)²` — passive proximity reveal
- Light beams: animated on timers with random shimmer
- No cursor-driven behavior
- No state progression

### Current Implementation

#### Data Glyphs — 4-Level State Machine (`updateDataGlyphs()`)
| Level | Name | Trigger | Visual Effect |
|-------|------|---------|---------------|
| 0 | Passive | Default | Invisible/faint |
| 1 | Revealed | Camera proximity > 0.3 | Ring opacity fades in, inner ring visible |
| 2 | Expanded | Cursor dwell > 2s + `dataPanelsExpanded` | Scale increases by 30%, metrics brighter, ring rotation accelerates |
| 3 | Resonating | Deep engagement (linger > 0.7 + emotional phase ≥ 3) | Scale +50%, metrics orbit radius expands, pulsing emissive glow at 1.5 intensity |

- `_interactionLevel` interpolates smoothly between levels (0.03 lerp)
- Rushing cannot reach level 2+ — requires intentional stillness
- Level 3 (resonating) is only reachable during revelation/transformation emotional phases

#### Light Beams — Cursor Responsive (`updateLightBeamsUserDriven()`)
- Beams tilt toward cursor dwell position when dwelling > 1.2s
- Rotation interpolation: `beam.rotation += (targetAngle - beam.rotation) * 0.01`
- Engaged beams brighten to 0.15 intensity
- Mouse velocity adds shimmer, but **reduced by depth** — surface beams shimmer freely, deep beams resist

#### Guide Fish — State Unlock
- Requires: `lingerFactor > 0.8` for 4+ cumulative seconds after 20s elapsed
- Once unlocked: one fish permanently becomes a guide
- Guide leads ahead on the camera path spline

### Files Changed
- `src/js/scenes/HomeScene.js` — `updateDataGlyphs()`, `updateLightBeamsUserDriven()`, `updateCreatures()` guide fish section

---

## 7. Emotional Progression Arc (REQ 6)

### Previous Implementation
No emotional arc. Lighting, fog, and interaction quality were constant throughout.

### Current Implementation

#### 5-Phase State Machine (in `UserIntent.js`)
| Phase | Name | Accumulation Driver | Lighting | Motion | Interaction |
|-------|------|---------------------|----------|--------|-------------|
| 0 | **Curiosity** | Scroll exploration + mouse movement | Calm (0.6 intensity) | Slow (0.7 scale) | Passive (0 resistance) |
| 1 | **Uncertainty** | Hesitation + lingering (rushing delays it) | Dim (0.35 intensity) | Unpredictable (1.3 scale) | Resistive (0.3) |
| 2 | **Confrontation** | Mouse intensity + rushing + cursor dwell | Violent (0.9 intensity) | Chaotic (2.0 scale) | Dynamic (0.6) |
| 3 | **Revelation** | Stillness after intensity (lingering + low rush) | Soft glow (0.7 intensity) | Guided (0.5 scale) | Responsive (-0.2) |
| 4 | **Transformation** | Final state (no accumulation) | Subtle aurora (0.55 intensity) | Harmonic (0.4 scale) | Cohesive (-0.5) |

#### Phase Transition Rules
- Each phase accumulates a float from 0 to 1 based on user behavior
- When accumulator reaches 1.0, phase advances
- **Phase 0 → 1**: Advances with exploration (scroll + mouse)
- **Phase 1 → 2**: Advances with hesitation, delayed by rushing
- **Phase 2 → 3**: Requires intense interaction to "survive" confrontation
- **Phase 3 → 4**: Requires stillness — the user must slow down after intensity
- `emotionalPhaseChange` CustomEvent dispatched on each transition

#### `updateEmotionalLighting(delta)` — HomeScene
- Interpolates between phase targets using 0.02 lerp rate
- Affects `mainLight.intensity` proportionally
- Confrontation phase: PP chromatic aberration spikes to `0.005 + progress * 0.008`
- Transformation phase: Background gradient shifts toward aurora colors (greens/purples)
- `emotionLighting.motionScale` affects camera roll amplitude
- `emotionLighting.intensity` affects fog density via emotional fog boost

### Files Changed
- `src/js/utils/UserIntent.js` — `_updateEmotionalPhase()`, phase state machine
- `src/js/scenes/HomeScene.js` — `updateEmotionalLighting()`, fog/roll modulation in `animate()`

---

## 8. Services Scene Integration

### Previous Implementation
ServicesScene was entirely system-centric:
- Camera lerp fixed at 0.03
- Signature object rotation on constant timers
- Showcase updated with fixed orbit speed
- Fog on fixed parameters
- No awareness of user behavior

### Current Implementation

#### Import & Update Loop
- Imports `userIntent` singleton
- Calls `userIntent.update(delta)` and `userIntent.updatePerceptionShift(delta)` every frame
- Uses `delta * userIntent.timeScale` for temporal distortion on particles

#### Camera — Intent-Responsive
- Lerp speed: `0.03 + rushFactor * 0.04 - lingerFactor * 0.015`
- Idle drift: camera breathes with `sin(elapsed * 0.13)` sway when `lingerFactor > 0.3`
- Roll includes emotional phase contribution and hesitation tremor

#### Signature Object — Emotional Phase Deformation
- `signatureEmotionalBias`: confrontation (phase 2) adds +0.6 bias, revelation/transformation adds -0.2
- Deformation bias feeds into ring shader `uDeformBias` uniform
- Confrontation: high-frequency tremor `sin(elapsed * 8) * emoBias * 0.02` on ring rotation
- Rotation speed multiplied by `userIntent.timeScale`

#### Showcase — State-Based Dwell Levels (`updateShowcaseUserDriven()`)
| Level | Trigger | Effect |
|-------|---------|--------|
| 0 (Passive) | Default or rushing | Normal orbit, standard glow |
| 1 (Revealed) | `lingerFactor > 0.5` | Increased float amplitude, brighter hover response |
| 2 (Expanded) | Cursor dwell > 1.5s | Panel scale +20%, connection lines brighter, orbit speed modulated |

- Rushing (`rushFactor > 0.5`) collapses back to level 0
- Orbit speed: `0.001 + rush * 0.004 - linger * 0.0005` — intent-driven

#### Fog — Emotional Phase
- Uncertainty: +0.01 density
- Confrontation: +0.02 density
- Revelation/Transformation: -0.005 density (clearing)

#### Hover Distortion — Intent Boost
- Mouse movement distortion scaled by `1 + rushFactor * 0.5`
- Rushing makes the water resist more violently

### Files Changed
- `src/js/scenes/ServicesScene.js` — imports, constructor state, `update()`, `updateCamera()`, `updateSignatureObject()`, `updateFog()`, `updateShowcaseUserDriven()` (replaces `updateShowcase()`)

---

## 9. File-by-File Summary

### New Files
| File | Lines | Purpose |
|------|-------|---------|
| `src/js/utils/UserIntent.js` | ~364 | Singleton behavioral tracker — reads user body language, exposes intent values |
| `CHANGELOG.md` | this file | Comprehensive change documentation |

### Modified Files

#### `src/js/scenes/HomeScene.js`
| Section | Change Type | Description |
|---------|-------------|-------------|
| `createCamera()` | **Rewritten** | Camera starts above ocean `(0, 120, 80)` instead of underwater `(0, -20, 8)` |
| `runCinematicTimeline()` | **Completely rewritten** | 5-phase "Drop" sequence: Stillness Above → Pull → Impact → Sinking → Settling. 9s total (was 15s). |
| `animate()` arrival phase | **Rewritten** | Hover sway above waves instead of micro-world drift |
| `animate()` Act 2 loop | **Completely rewritten** | All systems driven by `userIntent` — temporal distortion, idle drift, perception shift, intent-based camera lerp, emotional fog/roll |
| Constructor | **Extended** | Added state for: `zoneBlend`, `idleDrift`, `pendingZone`, `creatureMood`, `guideFish`, `perceptionShiftPlayed`, `invertedGravityFactor`, `glyphInteractionLevel`, `beamEngagementZone`, `emotionLighting` |
| `updateCreatures()` | **Completely rewritten** | 4 mood states (territorial/curious/guiding/neutral). Signature `(time)` → `(time, delta)`. |
| `updateDataGlyphs()` | **Completely rewritten** | 4-level state machine (passive → revealed → expanded → resonating) |
| `updateFuzzyZones()` | **New method** | Gated fuzzy zone blending with fog/lighting/PP interpolation |
| `applyZoneAtmosphere()` | **New method** | Full zone atmosphere transition (fog, exposure, background, lights) |
| `updateEmotionalLighting()` | **New method** | 5-phase emotional lighting envelope with PP effects |
| `updateLightBeamsUserDriven()` | **New method** | Cursor dwell-responsive beam tilting and depth-aware shimmer |

#### `src/js/scenes/ServicesScene.js`
| Section | Change Type | Description |
|---------|-------------|-------------|
| Imports | **Added** | `import { userIntent } from '../utils/UserIntent.js'` |
| Constructor | **Extended** | Added `intentCameraLerp`, `showcaseDwellLevel`, `signatureEmotionalBias` |
| `update()` | **Rewritten** | Calls `userIntent.update()`, temporal distortion, emotional bias, intent-scaled distortion |
| `updateCamera()` | **Rewritten** | Intent-responsive lerp, idle drift, emotional roll |
| `updateSignatureObject()` | **Rewritten** | Emotional deformation bias, intent-scaled rotation, confrontation tremor |
| `updateFog()` | **Rewritten** | Emotional phase shifts fog density |
| `updateShowcaseUserDriven()` | **New method** (replaces `updateShowcase()`) | 3-level dwell state machine, intent-driven orbit speed |

#### `src/js/three/PostProcessing.js`
No changes in this session. Existing capabilities used:
- `spike()` — intensity increased for surface impact
- `triggerRipple()` — centered ripple added at impact point
- `setZone()` / `setZoneBackground()` — used by fuzzy zone blending

---

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────┐
│                    USER INPUT                            │
│  scroll velocity · mouse position · idle time · clicks  │
└───────────────────────┬──────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────┐
│              UserIntent.js (Singleton)                   │
│                                                          │
│  rushFactor · lingerFactor · hesitationFactor            │
│  mouseIntensity · cursorDwelling · explorationRhythm     │
│  timeScale · emotionalPhase · perceptionShift            │
│  guideFishUnlocked · dataPanelsExpanded · beamResonance  │
└───┬──────────────┬──────────────┬────────────────────────┘
    │              │              │
    ▼              ▼              ▼
┌────────┐  ┌───────────┐  ┌───────────────┐
│HomeScene│  │ServicesScene│  │PostProcessing │
│        │  │            │  │               │
│Camera  │  │Camera lerp │  │Zone blend     │
│Creatures│  │Sig. object │  │Background grad│
│Glyphs  │  │Showcase    │  │Spike/Ripple   │
│Beams   │  │Fog/Lights  │  │Distortion     │
│Zones   │  │            │  │               │
│Emotion │  │            │  │               │
└────────┘  └────────────┘  └───────────────┘
```

---

*Last updated: February 7, 2026*
