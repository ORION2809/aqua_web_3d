/**
 * Aurora Aqua - Custom Cursor
 * Smooth cursor with hover states
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
    
    this.init();
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
    // Smooth follow
    this.position.x += (this.targetPosition.x - this.position.x) * 0.15;
    this.position.y += (this.targetPosition.y - this.position.y) * 0.15;
    
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
