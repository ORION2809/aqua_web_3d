# Aurora Aqua — Implementation Summary 2.0: The Fracture

> **Date:** February 7, 2026  
> **Build:** Doctrine + Instability Layer  
> **Repo:** https://github.com/ORION2809/aqua_web_3d  
> **Previous:** IMPLEMENTATION_SUMMARY.md (Doctrine Build — all systems stable)  
> **This Document:** What changed, why, and every line that matters.

---

## What This Build Is

The Doctrine Build (1.0) was flawless.  
Every number matched. Every rule held. Every system obeyed.

That was the problem.

A system that never fails cannot create awe.  
Awe requires the perception that coherence might not hold.

**This build introduces designed instability.**

Two systems. Two moments. One rule broken.

---

## The Philosophy

The user's critique identified the core tension:

> "Your system is too self-consistent. Everything follows rules, respects doctrine, resolves cleanly, transitions elegantly, never truly destabilizes itself. That makes it coherent, but not haunting."

The intervention required was not more features. It was **creative violence** — moments where the system appears to betray its own physics.

Three options were offered:
1. **The System Lies** — perceptual betrayal
2. **The Object Refuses** — loss of agency
3. **The World Remembers** — existential persistence

**We implemented all three principles, fused into two systems.**

---

## System 1: THE FRACTURE (HomeScene.js)

### What It Is

Once per session, at an unpredictable scroll position, the entire underwater world vanishes for 0.8 seconds. Fog clears. Roll zeros. Scroll direction reverses. The user glimpses the surface — normal, clean, safe.

Then it's ripped away. Everything returns at 2.5× intensity.

The user is left asking: *"Was that intentional… or did something break?"*

That question is the memory anchor.

### When It Triggers

- **Once per session** — `sessionStorage` tracks `aurora_fractured`
- **Only in the `complete` phase** — after cinematic is done, during free scroll
- **At a different scroll position every visit** — threshold randomized between 30%–70% of page depth
- **Never on returning visits within the same tab session** — you only get one fracture

### The Threshold

```javascript
this.fractureThreshold = 0.3 + ((Date.now() % 1000) / 2500);
// Range: 0.3 to ~0.7 of scroll progress
// Different every page load based on millisecond timestamp
```

This means:
- User A might get fractured at 35% scroll depth
- User B might get fractured at 68% scroll depth
- Neither knows when. Neither can prepare.

### The Three Phases

#### Phase 1: THE LIE (0–0.8s)

Everything that defines "underwater" is removed. Instantly. No transition.

| Property | Doctrine Value | Fracture Value |
|----------|---------------|----------------|
| Camera rotation.z | `sin(t*0.35)*0.08` | `0` — horizon snaps flat |
| Fog density | `0.06 + sin(t*0.6)*0.015` | `0.005` — near-clear |
| Camera Y | `-40 - perceivedDepth` | `-40 + perceivedDepth * 0.5` — reverses toward surface |
| Depth compression | `1 - depthFactor*0.15` | `1.0` — objects return to full scale |

The cruelty: for 0.8 seconds, the user sees the world they lost. It feels normal. It feels like escape.

#### Phase 2: THE PUNISHMENT (0.8–1.1s)

Everything returns at 2.5× intensity. No easing in. Linear slam over 0.3 seconds.

```javascript
const slam = Math.min((fe - 0.8) / 0.3, 1);
const intensity = 1 + slam * 1.5; // Reaches 2.5
```

| Property | Normal Doctrine | Punishment Peak |
|----------|----------------|-----------------|
| Camera roll | ±0.08 rad | ±0.20 rad |
| Fog density | 0.045–0.075 | 0.1125–0.1875 |
| Depth compression | max 15% | max 37.5% |

#### Phase 3: RECOVERY (1.1–2.2s)

Intensity eases from 2.5× back to 1.0× over 1.1 seconds. Doctrine values restore. The system resumes as if nothing happened.

```javascript
const recovery = (fe - 1.1) / 1.1;
const intensity = 2.5 - recovery * 1.5; // 2.5 → 1.0
```

After `fe >= 2.2`: `this.fractureActive = false`. Doctrine resumes permanently.

### Code Location

**File:** `HomeScene.js`  
**Constructor state:** Lines 34–39 (threshold, sessionStorage check)  
**Trigger condition:** Inside `animate()` ACT 2 block  
**Phase logic:** ~60 lines of conditional branches inside the `fractureActive` guard  

### Edge Cases Handled

| Issue | Fix |
|-------|-----|
| Scene destroyed mid-fracture (Barba navigation) | `destroy()` resets `fractureActive` and `fractureTriggered` |
| Tab backgrounded during fracture | Fracture phases are time-relative (`fe = time - fractureStart`), so phases play correctly on tab refocus — some phases may be skipped, which is acceptable |
| Session persistence | `sessionStorage.setItem('aurora_fractured', 'true')` prevents re-trigger on same-tab navigation |

---

## System 2: THE REFUSAL (ServicesScene.js)

### What It Is

One service — chosen randomly each visit — is disobeyed by the signature object.

The user scrolls to a service section. The UI updates (DOM highlights the service). But the object does **nothing**. It freezes in spacetime. Rotation stops. Deformation holds. Shader time pauses.

For 1.5 seconds, the 3D world ignores the user's input while the 2D world obeys.

Then: the object violently overreacts. Deformation bias slams to 3× the target (or -2.0 for stabilization), the rings flash white, then elastically settle to the intended state.

### When It Triggers

- **Once per visit** — `refusalTriggered` flag, no persistence across page loads
- **Random service each visit** — `Math.floor(Math.random() * 4)` (0–3, all services eligible)
- **Only on first arrival at the refused service** — subsequent visits to the same service behave normally

### The Sequence

#### Step 1: User Scrolls to Refused Service

```javascript
if (index === this.refusalIndex && !this.refusalTriggered) {
  this.refusalTriggered = true;
  this.refusalActive = true;
  this.refusalStart = performance.now() / 1000;
  this.pendingService = { index, bias, color };
  // UI updates via serviceChange event. Object does NOT.
  return;
}
```

The `return` is the critical line. `applyServiceMutation()` is never called. The DOM-side service highlighting happens. The 3D object stays frozen.

#### Step 2: Object Freezes (1.5 seconds)

In `updateSignatureObject()`:

```javascript
if (this.refusalActive) {
  this.frozenTimeOffset += (elapsed - (this._lastElapsed || elapsed));
  this._lastElapsed = elapsed;
  return; // Object stops. Time stops for it.
}
```

- Ring rotation halts
- Shader `uTime` stops advancing
- Deformation bias stays at previous value
- Lighting, camera, fog, particles ALL continue normally

The disconnect between the static object and the living world is the unsettling part.

**Time offset tracking:** When the refusal ends, `elapsed - frozenTimeOffset` is used for `uTime` so the shader doesn't jump discontinuously. The rings resume from exactly where they froze, not from where they "would have been."

#### Step 3: If User Scrolls Away During Refusal

```javascript
if (this.refusalActive) {
  this.refusalActive = false;
  this.pendingService = null;
}
this.applyServiceMutation(biases[index], colors[index]);
```

The refusal is cancelled. The new service applies normally. The refused service's mutation is **permanently skipped** unless the user scrolls back. The 3D state and UI state remain out of sync — this is intentional.

#### Step 4: Resolution — Violence (after 1.5s)

```javascript
updateRefusal() {
  if (!this.refusalActive || !this.pendingService) return;
  const refusalElapsed = (performance.now() / 1000) - this.refusalStart;
  if (refusalElapsed < 1.5) return;
  // RESOLVE
  ...
}
```

**Deformation slam:**

```javascript
const slamBias = Math.abs(pending.bias) < 0.1 ? -2.0 : pending.bias * 3;
```

| Service | Normal Bias | Slam Bias | Visual Effect |
|---------|------------|-----------|---------------|
| Aqua Sahay (contraction) | -0.5 | -1.5 | Violent inward crush |
| Aqua Intelligence (torsion) | 0.8 | 2.4 | Extreme twist distortion |
| Aqua Connect (fracture) | 1.2 | 3.6 | Explosive outward shatter |
| Early Access (stabilization) | 0.0 | -2.0 | Silence breaks into contraction shock |

The stabilization case (bias = 0.0) was a found edge case. Multiplying 0 by 3 produces 0 — no visible violence. Fix: when target bias is near-zero, slam to -2.0 instead. Even "calm" must break violently.

**GSAP animation chain:**
1. `deformationBias → slamBias` in 0.2s with `power4.in` (acceleration into violence)
2. `deformationBias → pending.bias` in 1.8s with `elastic.out(1, 0.3)` (wobbly recovery)

**Color flash:**
1. All ring colors → pure white (`{r:1, g:1, b:1}`) in 0.15s
2. White → target service colors in 1.2s

### Code Location

**File:** `ServicesScene.js` (607 lines total)  
**Constructor state:** Lines 43–49 (refusal vars, frozen time offset)  
**Trigger interception:** `setActiveService()` method  
**Object freeze:** `updateSignatureObject()` early return + time tracking  
**Resolution:** `updateRefusal()` method (~50 lines)

### Edge Cases Handled

| Issue | Fix |
|-------|-----|
| Service 0 never refused | Fixed: `Math.floor(Math.random() * 4)` includes 0 |
| Bias = 0 produces invisible violence | Fixed: minimum slam of -2.0 when target is near-zero |
| Shader time jump on unfreeze | Fixed: `frozenTimeOffset` accumulates paused time, `adjustedTime = elapsed - frozenTimeOffset` |
| Scroll listener leaks on scene destroy | Fixed: stored as `this.scrollHandler`, removed in `destroy()` |
| Scene destroyed mid-refusal | Fixed: `destroy()` resets `refusalActive` and `pendingService` |
| User scrolls past during refusal | Handled: refusal cancelled, new service applied normally |

---

## What Did NOT Change

All original Doctrine systems remain exactly as specified:

| System | Spec | Status |
|--------|------|--------|
| Camera roll drift | `sin(time*0.35)*0.08` | UNCHANGED — still raw, still never zero |
| Scroll-to-movement desync | `pow(scrollProgress, 1.4)*220` | UNCHANGED |
| Depth compression | `1 - depthFactor*0.15` | UNCHANGED (amplified only during fracture) |
| Fog breathing | `0.06 + sin(time*0.6)*0.015` | UNCHANGED (amplified only during fracture) |
| Signature ring construction | CatmullRomCurve3, 12pts, TubeGeometry(240,2.5,12) | UNCHANGED |
| Vertex deformation | `sin(pos.y*freq+time*1.2+offset)*1.8` | UNCHANGED |
| Service mutation biases | [-0.5, 0.8, 1.2, 0.0] | UNCHANGED (overshot only during refusal slam) |
| Scroll physics | duration 2.4, cubic easing | UNCHANGED |
| Cursor physics | 0.06 lerp | UNCHANGED |
| UI motion drag | duration×1.3, power2.out | UNCHANGED |
| Camera input resistance | 0.03 lerp | UNCHANGED |

The doctrine is the foundation. The fracture and refusal are cracks in the foundation. The cracks make it real.

---

## Complete File Change Log

### HomeScene.js (688 → 775 lines)

| Section | Change | Lines Added |
|---------|--------|-------------|
| Constructor | Added fracture state vars, sessionStorage check, threshold randomization | +7 |
| ACT 2 block | Restructured into fracture-aware conditional branches | +80 (replaces ~25) |
| `destroy()` | Added fracture state reset | +3 |

### ServicesScene.js (516 → 607 lines)

| Section | Change | Lines Added |
|---------|--------|-------------|
| Constructor | Added refusal state vars, frozen time offset | +8 |
| `setupServiceObserver()` | Stored scroll handler reference for cleanup | +2 (modified) |
| `setActiveService()` | Added refusal interception + cancel-on-scroll-away | +15 |
| `applyServiceMutation()` | Extracted from setActiveService into own method | +15 (new method) |
| `updateSignatureObject()` | Added freeze guard with time offset tracking | +8 |
| `update()` | Added `this.updateRefusal()` call | +1 |
| `updateRefusal()` | New method — 1.5s timer, slam resolution, white flash | +50 (new method) |
| `destroy()` | Added scroll listener cleanup, refusal state reset | +6 |

### Files NOT Changed

- `lenis.js` — underwater scroll physics untouched
- `cursor.js` — underwater cursor lerp untouched
- `animations.js` — UI motion drag untouched
- `main.js` — event wiring untouched
- All HTML files — untouched
- All CSS — untouched
- All Three.js infrastructure (`SceneManager`, `WaterSurface`, `ParticleSystem`, `LightingSetup`) — untouched

---

## Verification Results

### Static Analysis

| File | Errors | Warnings |
|------|--------|----------|
| HomeScene.js | 0 | 0 |
| ServicesScene.js | 0 | 0 |
| lenis.js | 0 | 0 |
| cursor.js | 0 | 0 |
| animations.js | 0 | 0 |
| main.js | 0 | 0 |

### Build Verification

- Vite dev server: compiled successfully, no errors
- Hot module reload: both files reloaded cleanly on edit
- Page load (index.html): no runtime errors in Vite console
- Page load (services.html): no runtime errors in Vite console

### Edge Case Audit (11 items reviewed)

| # | Issue Found | Severity | Resolution |
|---|------------|----------|------------|
| 1 | Fracture state survives scene destroy | Medium | Reset in `destroy()` |
| 2 | Refusal state survives scene destroy | Medium | Reset in `destroy()` |
| 3 | Threshold range 0.3–0.6996 not 0.3–0.7 | Cosmetic | Accepted — functionally irrelevant |
| 4 | `performance.now()` vs clock time mismatch | Low | Accepted — both derive from wall clock in normal operation |
| 5 | Scroll-away cancel skips mutation permanently | Intentional | By design — the disconnect IS the point |
| 6 | Bias=0 produces invisible slam | Critical | Fixed: minimum slam -2.0 |
| 7 | Service 0 immune to refusal | Medium | Fixed: `Math.floor(Math.random() * 4)` |
| 8 | Scroll listener leaks on destroy | Medium | Fixed: stored ref, removed in `destroy()` |
| 9 | Phase 1→2 camera snap is extreme | Intentional | By design — "no easing in" is the doctrine violation |
| 10 | Depth compression ineffective at deep camera Y | Low | Accepted — compression is subtle by doctrine spec anyway |
| 11 | uTime discontinuity on refusal unfreeze | Critical | Fixed: `frozenTimeOffset` tracking |

---

## The Design Intent (In Plain Language)

### The Fracture answers: "What permanent damage does the site inflict?"

Before: the underwater was a constant. Heavy, disorienting, but learnable. The brain adapted.

Now: for one moment, the brain is shown that escape is possible. The surface is glimpsed. Then it's taken away, harder. This is the cruelest thing you can do to a pattern-seeking mind: confirm that hope exists, then punish it.

After the fracture, the user cannot trust the system. Every scroll carries the subconscious question: *"Will it happen again?"* It won't — but they don't know that.

### The Refusal answers: "Does the impossible object truly feel alien?"

Before: the object responded instantly to every service. Obedient. Predictable. Impressive, but safe.

Now: once per visit, the object says *no*. The UI changes. The world continues. The object doesn't move. For 1.5 seconds the user's most primal interface expectation — "I act, the world reacts" — is violated.

Then the reaction comes, too hard. The elastic overshoot says: "I chose to respond. Not because you told me to."

The object becomes a character, not a visualization.

---

## What's Next (Unchanged from 1.0 Roadmap)

- **DOCTRINE 003:** Audio dimension (WebAudio drone, depth-reactive)
- **DOCTRINE 004:** Post-processing pipeline (chromatic aberration, DOF, grain)
- **DOCTRINE 005:** Page transition continuity (fog carries, camera bridges)
- **DOCTRINE 006:** Touch physics parity (gyroscope, haptics)
- **DOCTRINE 007:** Preloader as narrative prologue
- **DOCTRINE 008:** Performance-aware degradation
- **DOCTRINE 009:** Session memory (returning users skip cinematic)

---

*Implementation Summary 2.0 — The Fracture*  
*Two rules broken. Eleven edge cases audited. Zero errors.*  
*The system no longer feels safe. That's the point.*
