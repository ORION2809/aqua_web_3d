/**
 * Aurora Aqua - Loader
 * Initial loading animation
 */

import gsap from 'gsap';

export class Loader {
  constructor(onComplete) {
    this.loader = document.getElementById('loader');
    this.onComplete = onComplete || (() => {});
    this.minimumLoadTime = 1500; // Minimum time to show loader
    this.startTime = Date.now();
  }

  // Call when assets are ready
  complete() {
    const elapsed = Date.now() - this.startTime;
    const remainingTime = Math.max(0, this.minimumLoadTime - elapsed);
    
    setTimeout(() => {
      this.animateOut();
    }, remainingTime);
  }

  animateOut() {
    if (!this.loader) {
      this.onComplete();
      return;
    }

    const tl = gsap.timeline({
      onComplete: () => {
        this.loader.classList.add('is-hidden');
        this.onComplete();
      }
    });

    tl.to('.loader__bar', {
      width: '100%',
      duration: 0.3,
      ease: 'power2.out'
    });

    tl.to('.loader__text', {
      opacity: 0,
      y: -20,
      duration: 0.3,
      ease: 'power2.in'
    }, 0.1);

    tl.to('.loader__icon', {
      scale: 1.5,
      opacity: 0,
      duration: 0.4,
      ease: 'power2.in'
    }, 0.1);

    tl.to('.loader__progress', {
      opacity: 0,
      duration: 0.2
    }, 0.3);

    tl.to(this.loader, {
      opacity: 0,
      duration: 0.5,
      ease: 'power2.inOut'
    }, 0.4);
  }
}
