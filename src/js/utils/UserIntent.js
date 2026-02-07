/**
 * Aurora Aqua — User Intent Tracker
 * 
 * REQUIREMENT 1: MAKE BEHAVIOR USER-CENTRIC
 * 
 * This module reads the user's body language through input signals
 * and exposes semantic intent values that drive every system.
 * 
 * Fish, lights, fog, zone transitions — nothing responds to time or scroll.
 * Everything responds to the USER.
 * 
 * Signals tracked:
 *   - scroll velocity & acceleration
 *   - scroll direction changes (hesitation)
 *   - idle time (lingering / dwelling)
 *   - mouse velocity & stillness
 *   - cursor dwell zones (where attention lingers > 1.2s)
 *   - exploration rhythm (rushing vs contemplating)
 *   - emotional phase (derived from cumulative behavior)
 */

class UserIntentTracker {
  constructor() {
    // ═══ RAW INPUT ═══
    this._scrollY = 0;
    this._prevScrollY = 0;
    this._scrollDelta = 0;
    this._scrollVelocity = 0;
    this._scrollAccel = 0;
    this._prevScrollVelocity = 0;
    this._lastScrollTime = 0;
    this._scrollDirectionChanges = 0;
    this._lastScrollDirection = 0;
    this._directionChangeDecay = 0;
    
    this._mouseX = 0.5;
    this._mouseY = 0.5;
    this._mouseVelocity = 0;
    this._prevMouseX = 0.5;
    this._prevMouseY = 0.5;
    this._mouseIdleTime = 0;
    this._lastMouseMoveTime = 0;
    
    // ═══ DERIVED INTENT VALUES (0–1 floats, read by all systems) ═══
    
    /** How fast the user is scrolling (0 = still, 1 = rushing) */
    this.rushFactor = 0;
    
    /** How long the user has been idle (0 = just moved, 1 = lingering > 3s) */
    this.lingerFactor = 0;
    
    /** How hesitant the user is (frequent direction changes) */
    this.hesitationFactor = 0;
    
    /** Mouse movement intensity (0 = still, 1 = rapid) */
    this.mouseIntensity = 0;
    
    /** Cursor dwell — has the cursor been still for > 1.2s? */
    this.cursorDwelling = false;
    this.cursorDwellPosition = { x: 0.5, y: 0.5 };
    this.cursorDwellDuration = 0;
    
    /** Exploration rhythm: negative = rushing, 0 = flowing, positive = contemplating */
    this.explorationRhythm = 0;
    
    /** Zone gate: set true when user must pause before zone transition activates */
    this.zoneGateLocked = false;
    this.zoneGateTimer = 0;
    
    // ═══ REQUIREMENT 6: EMOTIONAL PROGRESSION ═══
    // curiosity → uncertainty → confrontation → revelation → transformation
    this.emotionalPhase = 'curiosity';     // current phase name
    this.emotionalPhaseIndex = 0;          // 0–4
    this.phaseProgress = 0;               // 0–1 within current phase
    this._phaseAccumulator = 0;
    this._confrontationTriggered = false;
    this._revelationTriggered = false;
    
    // ═══ REQUIREMENT 4: PERCEPTION SHIFT ═══
    this.perceptionShiftActive = false;
    this.perceptionShiftTriggered = false;
    this.perceptionShiftProgress = 0;
    this.gravityInverted = false;
    this.timeScale = 1.0;
    
    // ═══ REQUIREMENT 5: INTERACTION STATES ═══
    // Objects have states only reachable through active interaction
    this.guideFishUnlocked = false;     // unlocked by lingering in twilight zone
    this.dataPanelsExpanded = false;     // unlocked by dwelling cursor on panels
    this.beamResonance = 0;             // builds with mouse velocity near beams
    
    // Scroll history for pattern detection
    this._scrollHistory = [];       // { y, time, velocity }
    this._scrollHistoryMaxAge = 3;  // seconds
    
    // Bind handlers
    this._onScroll = this._handleScroll.bind(this);
    this._onMouseMove = this._handleMouseMove.bind(this);
    this._onMouseDown = this._handleMouseDown.bind(this);
    
    window.addEventListener('scroll', this._onScroll, { passive: true });
    window.addEventListener('mousemove', this._onMouseMove, { passive: true });
    window.addEventListener('mousedown', this._onMouseDown, { passive: true });
    
    this._startTime = performance.now() / 1000;
  }

  // ═══════════════════════════════════════════════════════════
  // RAW INPUT HANDLERS
  // ═══════════════════════════════════════════════════════════

  _handleScroll() {
    const now = performance.now() / 1000;
    const y = window.scrollY;
    const dt = Math.max(now - this._lastScrollTime, 0.001);
    
    this._prevScrollY = this._scrollY;
    this._scrollY = y;
    this._scrollDelta = y - this._prevScrollY;
    
    const newVelocity = this._scrollDelta / dt;
    this._scrollAccel = (newVelocity - this._scrollVelocity) / dt;
    this._prevScrollVelocity = this._scrollVelocity;
    this._scrollVelocity = newVelocity;
    this._lastScrollTime = now;
    
    // Direction change detection
    const dir = Math.sign(this._scrollDelta);
    if (dir !== 0 && dir !== this._lastScrollDirection) {
      this._scrollDirectionChanges++;
      this._lastScrollDirection = dir;
    }
    
    // Scroll history
    this._scrollHistory.push({ y, time: now, velocity: newVelocity });
    this._scrollHistory = this._scrollHistory.filter(e => now - e.time < this._scrollHistoryMaxAge);
  }

  _handleMouseMove(e) {
    const now = performance.now() / 1000;
    this._prevMouseX = this._mouseX;
    this._prevMouseY = this._mouseY;
    this._mouseX = e.clientX / window.innerWidth;
    this._mouseY = e.clientY / window.innerHeight;
    
    const dx = this._mouseX - this._prevMouseX;
    const dy = this._mouseY - this._prevMouseY;
    this._mouseVelocity = Math.sqrt(dx * dx + dy * dy) * 60; // normalize to per-frame
    this._lastMouseMoveTime = now;
    this._mouseIdleTime = 0;
  }

  _handleMouseDown() {
    // Clicks can accelerate emotional progression
    this._phaseAccumulator += 0.02;
  }

  // ═══════════════════════════════════════════════════════════
  // UPDATE — call once per frame from any scene
  // ═══════════════════════════════════════════════════════════

  update(delta) {
    const now = performance.now() / 1000;
    const elapsed = now - this._startTime;
    
    // ─── RUSH FACTOR ───
    // Based on scroll velocity with smoothing
    const absVel = Math.abs(this._scrollVelocity);
    const targetRush = Math.min(absVel / 2000, 1);
    this.rushFactor += (targetRush - this.rushFactor) * 0.08;
    
    // ─── LINGER FACTOR ───
    // How long since last scroll? Saturates at 3s → 1.0
    const scrollIdle = now - this._lastScrollTime;
    this.lingerFactor = Math.min(scrollIdle / 3.0, 1.0);
    
    // ─── HESITATION ───
    // Decaying count of direction changes
    this._directionChangeDecay += (this._scrollDirectionChanges * 0.3 - this._directionChangeDecay) * 0.05;
    this.hesitationFactor = Math.min(this._directionChangeDecay, 1.0);
    this._scrollDirectionChanges *= 0.95; // decay
    
    // ─── MOUSE INTENSITY ───
    this._mouseIdleTime += delta;
    const targetMouseIntensity = Math.min(this._mouseVelocity / 0.5, 1);
    this.mouseIntensity += (targetMouseIntensity - this.mouseIntensity) * 0.1;
    this._mouseVelocity *= 0.9;
    
    // ─── CURSOR DWELL ───
    if (this._mouseIdleTime > 1.2) {
      this.cursorDwelling = true;
      this.cursorDwellPosition = { x: this._mouseX, y: this._mouseY };
      this.cursorDwellDuration = this._mouseIdleTime - 1.2;
    } else {
      this.cursorDwelling = false;
      this.cursorDwellDuration = 0;
    }
    
    // ─── EXPLORATION RHYTHM ───
    // -1 = pure rushing, 0 = balanced, +1 = pure contemplation
    const rushContrib = -this.rushFactor;
    const lingerContrib = this.lingerFactor;
    const hesitContrib = this.hesitationFactor * 0.3;
    const targetRhythm = Math.max(-1, Math.min(1, rushContrib + lingerContrib + hesitContrib));
    this.explorationRhythm += (targetRhythm - this.explorationRhythm) * 0.03;
    
    // ─── ZONE GATE ───
    // REQ 2: If user has momentum, zone transition locks until they pause
    if (this.zoneGateLocked) {
      if (this.rushFactor < 0.15 && this.lingerFactor > 0.3) {
        this.zoneGateTimer += delta;
        if (this.zoneGateTimer > 0.4) {
          this.zoneGateLocked = false;
          this.zoneGateTimer = 0;
        }
      } else {
        this.zoneGateTimer = 0;
      }
    }
    
    // ─── REQUIREMENT 4: PERCEPTION SHIFT ───
    // Temporal distortion: time scale tied to user behavior
    // Rushing = time accelerates. Lingering = time slows (contemplation).
    const targetTimeScale = 1.0 + this.rushFactor * 0.8 - this.lingerFactor * 0.5;
    this.timeScale += (targetTimeScale - this.timeScale) * 0.02;
    this.timeScale = Math.max(0.3, Math.min(2.0, this.timeScale));
    
    // ─── REQUIREMENT 6: EMOTIONAL PROGRESSION ───
    this._updateEmotionalPhase(delta, elapsed);
    
    // ─── REQUIREMENT 5: INTERACTION STATE UNLOCKS ───
    // Guide fish unlocked by lingering in a deeper zone for > 4s total
    if (!this.guideFishUnlocked && this.lingerFactor > 0.8 && elapsed > 20) {
      this._guideFishLingerAccum = (this._guideFishLingerAccum || 0) + delta;
      if (this._guideFishLingerAccum > 4.0) {
        this.guideFishUnlocked = true;
      }
    }
    
    // Data panels expand after cursor dwells on them > 2s
    if (this.cursorDwelling && this.cursorDwellDuration > 2.0) {
      this.dataPanelsExpanded = true;
    }
    
    // Beam resonance builds with mouse velocity near center
    const centerDist = Math.sqrt((this._mouseX - 0.5) ** 2 + (this._mouseY - 0.5) ** 2);
    if (centerDist < 0.3 && this.mouseIntensity > 0.2) {
      this.beamResonance = Math.min(1, this.beamResonance + delta * 0.3);
    } else {
      this.beamResonance = Math.max(0, this.beamResonance - delta * 0.1);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // REQUIREMENT 6: EMOTIONAL PHASE STATE MACHINE
  // curiosity → uncertainty → confrontation → revelation → transformation
  // ═══════════════════════════════════════════════════════════

  _updateEmotionalPhase(delta, elapsed) {
    const phases = ['curiosity', 'uncertainty', 'confrontation', 'revelation', 'transformation'];
    
    // Phase accumulation based on user behavior (not time)
    let accumRate = 0;
    
    switch (this.emotionalPhaseIndex) {
      case 0: // CURIOSITY → UNCERTAINTY
        // User must explore (scroll some, move mouse) to advance
        accumRate = this.rushFactor * 0.03 + this.mouseIntensity * 0.02 + (this.hesitationFactor > 0.2 ? 0.01 : 0);
        break;
        
      case 1: // UNCERTAINTY → CONFRONTATION
        // Hesitation and direction changes accelerate this
        // Rushing delays it (overconfidence isn't uncertain)
        accumRate = this.hesitationFactor * 0.04 + this.lingerFactor * 0.02 - this.rushFactor * 0.01;
        break;
        
      case 2: // CONFRONTATION → REVELATION
        // Confrontation must be survived — accumulates during high interaction
        accumRate = this.mouseIntensity * 0.03 + this.rushFactor * 0.02 + (this.cursorDwelling ? 0.015 : 0);
        if (!this._confrontationTriggered) {
          this._confrontationTriggered = true;
        }
        break;
        
      case 3: // REVELATION → TRANSFORMATION
        // Stillness after intensity — user must slow down to progress
        accumRate = this.lingerFactor * 0.05 + (1 - this.rushFactor) * 0.02;
        if (!this._revelationTriggered) {
          this._revelationTriggered = true;
        }
        break;
        
      case 4: // TRANSFORMATION — final state
        accumRate = 0;
        this.phaseProgress = 1;
        break;
    }
    
    accumRate = Math.max(0, accumRate);
    this._phaseAccumulator += accumRate * delta;
    this.phaseProgress = Math.min(this._phaseAccumulator, 1);
    
    // Phase transition
    if (this._phaseAccumulator >= 1 && this.emotionalPhaseIndex < 4) {
      this.emotionalPhaseIndex++;
      this.emotionalPhase = phases[this.emotionalPhaseIndex];
      this._phaseAccumulator = 0;
      this.phaseProgress = 0;
      
      // Dispatch event for other systems
      window.dispatchEvent(new CustomEvent('emotionalPhaseChange', {
        detail: { phase: this.emotionalPhase, index: this.emotionalPhaseIndex }
      }));
    }
  }

  // ═══════════════════════════════════════════════════════════
  // ZONE GATE — call before allowing a zone transition
  // Returns true if transition is allowed, false if gated
  // ═══════════════════════════════════════════════════════════

  requestZoneTransition() {
    if (this.rushFactor > 0.4) {
      // User is rushing — lock the gate
      this.zoneGateLocked = true;
      this.zoneGateTimer = 0;
      return false;
    }
    return true;
  }

  // ═══════════════════════════════════════════════════════════
  // PERCEPTION SHIFT — trigger from scene
  // ═══════════════════════════════════════════════════════════

  triggerPerceptionShift() {
    if (this.perceptionShiftTriggered) return;
    this.perceptionShiftTriggered = true;
    this.perceptionShiftActive = true;
    this.perceptionShiftProgress = 0;
    this.gravityInverted = true;
  }

  updatePerceptionShift(delta) {
    if (!this.perceptionShiftActive) return;
    this.perceptionShiftProgress += delta * 0.25; // ~4 seconds
    if (this.perceptionShiftProgress >= 1) {
      this.perceptionShiftActive = false;
      this.perceptionShiftProgress = 1;
      this.gravityInverted = false;
    }
  }

  // Cleanup
  dispose() {
    window.removeEventListener('scroll', this._onScroll);
    window.removeEventListener('mousemove', this._onMouseMove);
    window.removeEventListener('mousedown', this._onMouseDown);
  }
}

// Singleton — shared between all scenes
export const userIntent = new UserIntentTracker();
