/**
 * Aurora Aqua - Lenis Smooth Scroll
 * Synced with GSAP ScrollTrigger
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
    
    this.init();
  }

  init() {
    // Create Lenis instance
    this.lenis = new Lenis({
      duration: isMobile() ? 1 : 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      direction: 'vertical',
      gestureDirection: 'vertical',
      smooth: true,
      mouseMultiplier: 1,
      smoothTouch: false, // Disable smooth scroll on touch devices
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
        duration: options.duration || 1.5,
        easing: options.easing || ((t) => Math.min(1, 1.001 - Math.pow(2, -10 * t))),
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
