/**
 * Aurora Aqua - Main Entry Point
 * Integrates all modules: Three.js, GSAP, Lenis, Barba.js
 */

import '../styles/main.css';

// Core modules
import { SmoothScroll } from './lenis.js';
import { PageTransitions } from './barba.js';
import { Animations } from './animations.js';
import { Navigation } from './navigation.js';
import { CustomCursor } from './cursor.js';
import { Loader } from './loader.js';
import { FormHandler } from './form.js';

// Page scenes
import { HomeScene } from './scenes/HomeScene.js';
import { AboutScene } from './scenes/AboutScene.js';
import { ServicesScene } from './scenes/ServicesScene.js';
import { ContactScene } from './scenes/ContactScene.js';

class AuroraAqua {
  constructor() {
    this.smoothScroll = null;
    this.animations = null;
    this.navigation = null;
    this.cursor = null;
    this.currentScene = null;
    this.pageTransitions = null;
    
    console.log('🌊 Aurora Aqua Initializing...');
    
    // Initialize
    this.init();
  }

  init() {
    try {
      // Initialize loader
      const loader = new Loader(() => {
        this.onLoadComplete();
      });

      // Start loading
      this.preload().then(() => {
        loader.complete();
      });
    } catch (error) {
      console.error('Init error:', error);
      // Skip loader and initialize directly
      this.onLoadComplete();
    }
  }

  async preload() {
    // Preload critical assets
    const preloadImages = document.querySelectorAll('img[data-src]');
    const promises = [];

    preloadImages.forEach(img => {
      promises.push(new Promise((resolve) => {
        const image = new Image();
        image.onload = resolve;
        image.onerror = resolve;
        image.src = img.dataset.src;
        img.src = img.dataset.src;
      }));
    });

    // Wait for fonts
    if (document.fonts && document.fonts.ready) {
      promises.push(document.fonts.ready);
    }

    await Promise.all(promises);
    return true;
  }

  onLoadComplete() {
    console.log('🌊 Load complete, initializing...');
    
    try {
      // Initialize smooth scroll
      this.smoothScroll = new SmoothScroll();
      console.log('✅ SmoothScroll initialized');

      // Listen for cinematic scroll lock/unlock events
      this.setupCinematicEvents();

      // Initialize navigation
      this.navigation = new Navigation();
      console.log('✅ Navigation initialized');

      // Initialize cursor
      this.cursor = new CustomCursor();
      console.log('✅ Cursor initialized');

      // Initialize animations for current page
      this.animations = new Animations();
      this.animations.initPageAnimations();
      console.log('✅ Animations initialized');

      // Initialize form handler if on contact page
      this.initForm();

      // Initialize 3D scene for current page
      this.initializeScene();

      // Initialize page transitions
      this.initBarba();

      // Add loaded class to body
      document.body.classList.add('is-loaded');
      
      console.log('🌊 Aurora Aqua Ready!');
    } catch (error) {
      console.error('Initialization error:', error);
      document.body.classList.add('is-loaded');
    }
  }

  setupCinematicEvents() {
    // Lock scroll during cinematic
    window.addEventListener('lockScroll', () => {
      console.log('🔒 Lenis: Scroll locked for cinematic');
      if (this.smoothScroll && this.smoothScroll.lenis) {
        this.smoothScroll.lenis.stop();
      }
    });
    
    // Unlock scroll after cinematic
    window.addEventListener('unlockScroll', () => {
      console.log('🔓 Lenis: Scroll unlocked');
      if (this.smoothScroll && this.smoothScroll.lenis) {
        this.smoothScroll.lenis.start();
      }
    });
    
    // Surface breach event
    window.addEventListener('surfaceBreach', () => {
      console.log('🌊 Surface breach event received');
    });
    
    // Cinematic complete
    window.addEventListener('cinematicComplete', () => {
      console.log('🎬 Cinematic sequence complete');
    });
  }

  initForm() {
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
      this.formHandler = new FormHandler('#contact-form');
    }
  }

  initializeScene() {
    const namespace = document.querySelector('[data-barba-namespace]')?.dataset.barbaNamespace 
                   || document.querySelector('[data-barba="container"]')?.dataset.barbaNamespace;
    const container = document.getElementById('canvas-container');

    console.log('🌊 Initializing scene:', namespace, 'Container:', container);

    if (!container) {
      console.warn('Canvas container not found!');
      return;
    }

    // Clean up existing scene
    if (this.currentScene) {
      this.currentScene.destroy();
      this.currentScene = null;
    }

    try {
      // Create scene based on page
      console.log('🌊 Creating scene for:', namespace);
      switch (namespace) {
        case 'home':
          this.currentScene = new HomeScene(container);
          break;
        case 'about':
          this.currentScene = new AboutScene(container);
          break;
        case 'services':
          this.currentScene = new ServicesScene(container);
          break;
        case 'contact':
          this.currentScene = new ContactScene(container);
          break;
        default:
          console.log('🌊 Default case: creating HomeScene');
          this.currentScene = new HomeScene(container);
      }
      console.log('✅ Scene created:', this.currentScene);

      // Start rendering
      if (this.currentScene) {
        this.currentScene.start();
        console.log('🌊 3D Scene started!');
        
        // Connect scroll to scene
        if (this.smoothScroll) {
          this.smoothScroll.onScroll((e) => {
            if (this.currentScene && this.currentScene.onScroll) {
              this.currentScene.onScroll(e.scroll, e.limit);
            }
          });
        }
      }
    } catch (error) {
      console.error('Scene initialization error:', error);
    }
  }

  initBarba() {
    this.pageTransitions = new PageTransitions({
      onBeforeLeave: (data) => {
        // Pause current scene rendering
        if (this.currentScene) {
          this.currentScene.pause();
        }
        
        // Stop smooth scroll
        if (this.smoothScroll) {
          this.smoothScroll.stop();
        }
      },

      onLeave: (data) => {
        // Cleanup animations
        if (this.animations) {
          this.animations.destroy();
        }

        // Destroy current scene
        if (this.currentScene) {
          this.currentScene.destroy();
          this.currentScene = null;
        }
      },

      onEnter: (data) => {
        // Reset scroll position
        if (this.smoothScroll) {
          this.smoothScroll.reset();
        }

        // Initialize new scene
        setTimeout(() => {
          this.initializeScene();
        }, 100);
      },

      onAfterEnter: (data) => {
        // Re-initialize smooth scroll
        if (this.smoothScroll) {
          this.smoothScroll.start();
        }

        // Re-initialize animations
        this.animations = new Animations();
        this.animations.initPageAnimations();

        // Re-initialize form if on contact page
        this.initForm();

        // Refresh navigation
        if (this.navigation) {
          this.navigation.refresh();
        }

        // Refresh cursor
        if (this.cursor) {
          this.cursor.refresh();
        }
      }
    });
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new AuroraAqua();
  });
} else {
  new AuroraAqua();
}

// Export for debugging
window.AuroraAqua = AuroraAqua;
