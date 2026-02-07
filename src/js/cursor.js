/**
 * Aurora Aqua - Custom Cursor
 * PRODUCTION DOCTRINE BUILD
 * 
 * UNDERWATER CURSOR PHYSICS
 * 
 * Cursor must lag reality.
 * If cursor feels precise → reject
 */

import gsap from 'gsap';
import { isTouch } from './utils/device.js';

export class CustomCursor {
  constructor() {
    if (isTouch()) return;
    
    this.cursor = document.getElementById('cursor');
    this.cursorInner = this.cursor?.querySelector('.cursor__inner');
    
    if (!this.cursor) return;
    
    this.position = { x: 0, y: 0 };
    this.targetPosition = { x: 0, y: 0 };
    this.isHovering = false;
    this.isUnderwater = false;
    
    // UNDERWATER PHYSICS: 0.06 lerp
    // THE SCAR: if fractured, 0.048 — cursor drags deeper into the dark
    this.normalLerp = 0.15;
    this.underwaterLerp = 0.06;
    this.scarredLerp = 0.048;
    this.currentLerp = this.normalLerp;
    this.isScarred = false;
    
    try { this.isScarred = sessionStorage.getItem('aurora_scarred') === 'true'; } catch(e) {}
    
    this.init();
    this.setupUnderwaterListener();
  }

  init() {
    // Mouse move
    document.addEventListener('mousemove', (e) => {
      this.targetPosition.x = e.clientX;
      this.targetPosition.y = e.clientY;
    });

    // Hover states
    this.setupHoverStates();
    
    // Animation loop
    this.animate();
  }

  // ═══════════════════════════════════════════════════════════
  // UNDERWATER PHYSICS
  // ═══════════════════════════════════════════════════════════

  setupUnderwaterListener() {
    window.addEventListener('surfaceBreach', () => {
      this.isUnderwater = true;
      this.currentLerp = this.isScarred ? this.scarredLerp : this.underwaterLerp;
    });
    
    window.addEventListener('applyUnderwaterPhysics', () => {
      this.isUnderwater = true;
      this.currentLerp = this.isScarred ? this.scarredLerp : this.underwaterLerp;
    });
    
    // THE SCAR — fracture corrupts cursor permanently
    // 0.06 → 0.048. The cursor falls behind your hand.
    // You reach for things and they resist you.
    window.addEventListener('physicsScar', () => {
      this.isScarred = true;
      if (this.isUnderwater) {
        this.currentLerp = this.scarredLerp;
      }
    });
  }

  setupHoverStates() {
    // Interactive elements
    const interactiveElements = document.querySelectorAll(
      'a, button, [data-magnetic], [data-tilt], input, textarea, select'
    );
    
    interactiveElements.forEach(el => {
      el.addEventListener('mouseenter', () => {
        this.cursor.classList.add('is-hovering');
        this.isHovering = true;
      });
      
      el.addEventListener('mouseleave', () => {
        this.cursor.classList.remove('is-hovering');
        this.isHovering = false;
      });
    });

    // Hide cursor when leaving window
    document.addEventListener('mouseleave', () => {
      gsap.to(this.cursor, {
        opacity: 0,
        duration: 0.3
      });
    });

    document.addEventListener('mouseenter', () => {
      gsap.to(this.cursor, {
        opacity: 1,
        duration: 0.3
      });
    });
  }

  animate() {
    // CURSOR PHYSICS - non-negotiable
    // cursor.x += (targetX - cursor.x) * 0.06
    // cursor.y += (targetY - cursor.y) * 0.06
    // If cursor feels precise → reject
    
    this.position.x += (this.targetPosition.x - this.position.x) * this.currentLerp;
    this.position.y += (this.targetPosition.y - this.position.y) * this.currentLerp;
    
    gsap.set(this.cursor, {
      x: this.position.x,
      y: this.position.y
    });
    
    requestAnimationFrame(() => this.animate());
  }

  // Re-init hover states after page transition
  refresh() {
    this.setupHoverStates();
  }
}
