/**
 * Aurora Aqua - Barba.js Page Transitions
 * Smooth page transitions with Three.js scene management
 */

import barba from '@barba/core';
import gsap from 'gsap';

export class PageTransitions {
  constructor(options = {}) {
    this.onBeforeLeave = options.onBeforeLeave || (() => {});
    this.onLeave = options.onLeave || (() => {});
    this.onEnter = options.onEnter || (() => {});
    this.onAfterEnter = options.onAfterEnter || (() => {});
    
    this.init();
  }

  init() {
    // Create transition overlay if not exists
    this.createOverlay();
    
    barba.init({
      preventRunning: true,
      transitions: [
        {
          name: 'default-transition',
          
          // Synchronous hooks
          sync: false,
          
          // Before anything
          beforeLeave: (data) => {
            return new Promise(resolve => {
              this.onBeforeLeave(data);
              resolve();
            });
          },
          
          // Leave animation
          leave: (data) => {
            return new Promise(resolve => {
              const tl = gsap.timeline({
                onComplete: () => {
                  this.onLeave(data);
                  resolve();
                }
              });
              
              // Fade out current page
              tl.to(data.current.container, {
                opacity: 0,
                y: -30,
                duration: 0.5,
                ease: 'power2.in'
              });
              
              // Animate overlay in
              tl.to('.transition-overlay', {
                y: '0%',
                duration: 0.6,
                ease: 'power3.inOut'
              }, 0.2);
            });
          },
          
          // After leave, before enter
          beforeEnter: (data) => {
            // Reset new container
            gsap.set(data.next.container, {
              opacity: 0,
              y: 30
            });
            
            // Scroll to top
            window.scrollTo(0, 0);
          },
          
          // Enter animation
          enter: (data) => {
            return new Promise(resolve => {
              this.onEnter(data);
              
              const tl = gsap.timeline({
                onComplete: resolve
              });
              
              // Animate overlay out
              tl.to('.transition-overlay', {
                y: '-100%',
                duration: 0.6,
                ease: 'power3.inOut'
              });
              
              // Fade in new page
              tl.to(data.next.container, {
                opacity: 1,
                y: 0,
                duration: 0.6,
                ease: 'power2.out'
              }, 0.3);
            });
          },
          
          // After everything
          afterEnter: (data) => {
            this.onAfterEnter(data);
            
            // Reset overlay position for next transition
            gsap.set('.transition-overlay', { y: '100%' });
          }
        },
        
        // Water-wipe transition for home page
        {
          name: 'water-wipe',
          from: { namespace: ['home'] },
          to: { namespace: ['about', 'services'] },
          
          leave: (data) => {
            return new Promise(resolve => {
              const tl = gsap.timeline({
                onComplete: () => {
                  this.onLeave(data);
                  resolve();
                }
              });
              
              // More dramatic exit from home
              tl.to(data.current.container, {
                opacity: 0,
                scale: 0.95,
                filter: 'blur(10px)',
                duration: 0.6,
                ease: 'power2.in'
              });
              
              tl.to('.transition-overlay', {
                y: '0%',
                duration: 0.7,
                ease: 'power4.inOut'
              }, 0.2);
            });
          },
          
          enter: (data) => {
            return new Promise(resolve => {
              this.onEnter(data);
              
              gsap.set(data.next.container, {
                opacity: 0,
                y: 50
              });
              
              const tl = gsap.timeline({
                onComplete: resolve
              });
              
              tl.to('.transition-overlay', {
                y: '-100%',
                duration: 0.7,
                ease: 'power4.inOut'
              });
              
              tl.to(data.next.container, {
                opacity: 1,
                y: 0,
                duration: 0.8,
                ease: 'power3.out'
              }, 0.3);
            });
          }
        }
      ],
      
      // Views for page-specific logic
      views: [
        {
          namespace: 'home',
          beforeEnter() {
            document.body.classList.add('page-home');
          },
          afterLeave() {
            document.body.classList.remove('page-home');
          }
        },
        {
          namespace: 'about',
          beforeEnter() {
            document.body.classList.add('page-about');
          },
          afterLeave() {
            document.body.classList.remove('page-about');
          }
        },
        {
          namespace: 'services',
          beforeEnter() {
            document.body.classList.add('page-services');
          },
          afterLeave() {
            document.body.classList.remove('page-services');
          }
        },
        {
          namespace: 'contact',
          beforeEnter() {
            document.body.classList.add('page-contact');
          },
          afterLeave() {
            document.body.classList.remove('page-contact');
          }
        }
      ]
    });
  }

  createOverlay() {
    if (!document.querySelector('.transition-overlay')) {
      const overlay = document.createElement('div');
      overlay.className = 'transition-overlay';
      overlay.innerHTML = `
        <div class="transition-overlay__inner">
          <div class="transition-overlay__wave"></div>
        </div>
      `;
      document.body.appendChild(overlay);
      
      // Initial position
      gsap.set(overlay, { y: '100%' });
    }
  }

  // Force a page refresh (useful for debugging)
  refresh() {
    barba.force(window.location.href);
  }

  // Programmatically navigate to a page
  go(url) {
    barba.go(url);
  }

  // Destroy Barba instance
  destroy() {
    barba.destroy();
  }
}
