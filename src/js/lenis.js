/**
 * Aurora Aqua - Lenis Smooth Scroll
 * PRODUCTION DOCTRINE BUILD
 * 
 * UNDERWATER PHYSICS RULESET
 * 
 * Scroll must feel resistant.
 * If scroll feels snappy → reject
 */

import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { isMobile } from './utils/device.js';

gsap.registerPlugin(ScrollTrigger);

export class SmoothScroll {
  constructor() {
    this.lenis = null;
    this.rafId = null;
    this.scrollCallbacks = [];
    this.isUnderwater = false;
    this.isScarred = false;
    
    // THE SCAR — permanent physics corruption from fracture
    try { this.isScarred = sessionStorage.getItem('aurora_scarred') === 'true'; } catch(e) {}
    
    this.init();
    this.setupUnderwaterListener();
  }

  init() {
    // Create Lenis instance - normal mode initially
    this.lenis = new Lenis({
      duration: isMobile() ? 1 : 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      direction: 'vertical',
      gestureDirection: 'vertical',
      smooth: true,
      mouseMultiplier: 1,
      smoothTouch: false,
      touchMultiplier: 2,
      infinite: false,
    });

    // Sync Lenis with GSAP ScrollTrigger
    this.lenis.on('scroll', ScrollTrigger.update);

    // Add to GSAP ticker
    gsap.ticker.add((time) => {
      this.lenis.raf(time * 1000);
    });

    gsap.ticker.lagSmoothing(0);

    // Custom scroll callbacks
    this.lenis.on('scroll', (e) => {
      this.scrollCallbacks.forEach(callback => callback(e));
    });
  }

  // ═══════════════════════════════════════════════════════════
  // UNDERWATER PHYSICS
  // ═══════════════════════════════════════════════════════════

  setupUnderwaterListener() {
    window.addEventListener('applyUnderwaterPhysics', () => {
      this.applyUnderwaterPhysics();
    });
    
    window.addEventListener('surfaceBreach', () => {
      // Pre-apply some resistance
      if (this.lenis) this.lenis.options.duration = 1.8;
    });
    
    // THE SCAR — fracture corrupts scroll permanently
    // duration creeps heavier. mouseMultiplier fights harder.
    // The user scrolls through mud now and doesn't know why.
    window.addEventListener('physicsScar', () => {
      this.isScarred = true;
      if (this.isUnderwater && this.lenis) {
        this.lenis.options.duration = 2.55;
        this.lenis.options.mouseMultiplier = 0.52;
      }
    });
  }

  applyUnderwaterPhysics() {
    if (this.isUnderwater) return;
    
    this.isUnderwater = true;
    
    // UNDERWATER SCROLL PHYSICS — non-negotiable
    // THE SCAR: if fractured, values shift permanently
    // duration: 2.4 → 2.55 (the world is heavier now)
    // mouseMultiplier: 0.6 → 0.52 (you fight harder for every pixel)
    
    this.lenis.options.duration = this.isScarred ? 2.55 : 2.4;
    this.lenis.options.easing = (t) => 1 - Math.pow(1 - t, 3);
    
    // Reduce multipliers for more resistance
    this.lenis.options.mouseMultiplier = this.isScarred ? 0.52 : 0.6;
    this.lenis.options.touchMultiplier = 1.2;
  }

  // Get scroll progress (0-1)
  getScrollProgress() {
    if (!this.lenis) return 0;
    return this.lenis.scroll / (this.lenis.limit || 1);
  }

  // Get current scroll position
  getScrollPosition() {
    return this.lenis ? this.lenis.scroll : 0;
  }

  // Subscribe to scroll events
  onScroll(callback) {
    this.scrollCallbacks.push(callback);
    return () => {
      const index = this.scrollCallbacks.indexOf(callback);
      if (index > -1) {
        this.scrollCallbacks.splice(index, 1);
      }
    };
  }

  // Scroll to element or position
  scrollTo(target, options = {}) {
    if (this.lenis) {
      this.lenis.scrollTo(target, {
        offset: options.offset || 0,
        duration: options.duration || (this.isUnderwater ? 2.4 : 1.5),
        easing: options.easing || (this.isUnderwater 
          ? (t) => 1 - Math.pow(1 - t, 3)
          : (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t))),
        immediate: options.immediate || false,
        lock: options.lock || false,
        onComplete: options.onComplete || null,
      });
    }
  }

  // Stop scrolling
  stop() {
    if (this.lenis) {
      this.lenis.stop();
    }
  }

  // Start scrolling
  start() {
    if (this.lenis) {
      this.lenis.start();
    }
  }

  // Reset scroll to top
  reset() {
    if (this.lenis) {
      this.lenis.scrollTo(0, { immediate: true });
    }
  }

  // Destroy instance
  destroy() {
    if (this.lenis) {
      this.lenis.destroy();
      this.lenis = null;
    }
    this.scrollCallbacks = [];
  }

  // Get Lenis instance
  getInstance() {
    return this.lenis;
  }
}
