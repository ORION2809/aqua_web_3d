/**
 * Aurora Aqua - GSAP Animations
 * Text animations, scroll triggers, and interactive effects
 */

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export class Animations {
  constructor(lenis) {
    this.lenis = lenis;
    this.ctx = null;
    this.splitTexts = [];
    
    this.init();
  }

  init() {
    // Create GSAP context for easy cleanup
    this.ctx = gsap.context(() => {});
  }

  // Initialize all page animations
  initPageAnimations() {
    this.ctx.revert(); // Clean up previous animations
    
    this.ctx = gsap.context(() => {
      this.initTextAnimations();
      this.initScrollAnimations();
      this.initHoverEffects();
      this.initCounterAnimations();
      this.initParallaxEffects();
      this.initStaggerAnimations();
    });
  }

  // Text split and reveal animations
  initTextAnimations() {
    // Split text into words/chars for animation
    const splitElements = document.querySelectorAll('[data-split]');
    
    splitElements.forEach(element => {
      // Skip if already processed
      if (element.classList.contains('split-processed')) return;
      
      const text = element.textContent.trim().replace(/\s+/g, ' ');
      const words = text.split(' ');
      
      element.innerHTML = words.map(word => 
        `<span class="word"><span class="word-inner">${word}</span></span>`
      ).join(' ');
      
      element.classList.add('split-processed');
      
      // Animate each word
      const wordInners = element.querySelectorAll('.word-inner');
      
      gsap.set(wordInners, { 
        y: '100%',
        opacity: 0 
      });
      
      ScrollTrigger.create({
        trigger: element,
        start: 'top 85%',
        once: true,
        onEnter: () => {
          gsap.to(wordInners, {
            y: '0%',
            opacity: 1,
            duration: 0.8,
            stagger: 0.03,
            ease: 'power3.out'
          });
        }
      });
    });
  }

  // Scroll-triggered animations
  initScrollAnimations() {
    // Section labels
    gsap.utils.toArray('.section__label').forEach(label => {
      gsap.from(label, {
        scrollTrigger: {
          trigger: label,
          start: 'top 85%',
          once: true
        },
        y: 20,
        opacity: 0,
        duration: 0.6,
        ease: 'power2.out'
      });
    });

    // Vision cards
    gsap.utils.toArray('.vision__card').forEach((card, i) => {
      gsap.from(card, {
        scrollTrigger: {
          trigger: card,
          start: 'top 85%',
          once: true
        },
        y: 60,
        opacity: 0,
        duration: 0.8,
        delay: i * 0.15,
        ease: 'power3.out'
      });
    });

    // Service cards
    gsap.utils.toArray('.service-card').forEach((card, i) => {
      gsap.from(card, {
        scrollTrigger: {
          trigger: card,
          start: 'top 85%',
          once: true
        },
        y: 80,
        opacity: 0,
        rotateX: 10,
        duration: 1,
        delay: i * 0.1,
        ease: 'power3.out'
      });
    });

    // Service detail sections
    gsap.utils.toArray('.service-detail').forEach(detail => {
      const visual = detail.querySelector('.service-detail__visual');
      const content = detail.querySelector('.service-detail__content');
      const isReverse = detail.classList.contains('service-detail--reverse');
      
      gsap.from(visual, {
        scrollTrigger: {
          trigger: detail,
          start: 'top 75%',
          once: true
        },
        x: isReverse ? 100 : -100,
        opacity: 0,
        duration: 1,
        ease: 'power3.out'
      });
      
      gsap.from(content, {
        scrollTrigger: {
          trigger: detail,
          start: 'top 75%',
          once: true
        },
        x: isReverse ? -50 : 50,
        opacity: 0,
        duration: 1,
        delay: 0.2,
        ease: 'power3.out'
      });
    });

    // Timeline items
    gsap.utils.toArray('.timeline__item').forEach((item, i) => {
      gsap.from(item, {
        scrollTrigger: {
          trigger: item,
          start: 'top 80%',
          once: true
        },
        x: -50,
        opacity: 0,
        duration: 0.8,
        delay: i * 0.1,
        ease: 'power3.out'
      });
    });

    // Mission cards
    gsap.utils.toArray('.mission__card').forEach((card, i) => {
      gsap.from(card, {
        scrollTrigger: {
          trigger: card,
          start: 'top 80%',
          once: true
        },
        y: 60,
        opacity: 0,
        duration: 1,
        delay: i * 0.15,
        ease: 'power3.out'
      });
    });

    // Value cards
    gsap.utils.toArray('.value-card').forEach((card, i) => {
      gsap.from(card, {
        scrollTrigger: {
          trigger: card,
          start: 'top 85%',
          once: true
        },
        y: 40,
        opacity: 0,
        scale: 0.95,
        duration: 0.6,
        delay: i * 0.08,
        ease: 'power2.out'
      });
    });

    // Team cards
    gsap.utils.toArray('.team-card').forEach((card, i) => {
      gsap.from(card, {
        scrollTrigger: {
          trigger: card,
          start: 'top 85%',
          once: true
        },
        y: 60,
        opacity: 0,
        duration: 0.8,
        delay: i * 0.12,
        ease: 'power3.out'
      });
    });

    // Process cards
    gsap.utils.toArray('.process-card').forEach((card, i) => {
      gsap.from(card, {
        scrollTrigger: {
          trigger: card,
          start: 'top 85%',
          once: true
        },
        y: 50,
        opacity: 0,
        scale: 0.9,
        duration: 0.7,
        delay: i * 0.1,
        ease: 'back.out(1.5)'
      });
    });

    // Industry cards
    gsap.utils.toArray('.industry-card').forEach((card, i) => {
      gsap.from(card, {
        scrollTrigger: {
          trigger: card,
          start: 'top 85%',
          once: true
        },
        y: 30,
        opacity: 0,
        duration: 0.5,
        delay: i * 0.08,
        ease: 'power2.out'
      });
    });

    // Stats section
    const statsSection = document.querySelector('.section--stats');
    if (statsSection) {
      ScrollTrigger.create({
        trigger: statsSection,
        start: 'top 70%',
        once: true,
        onEnter: () => this.animateCounters()
      });
    }

    // CTA section
    gsap.utils.toArray('.section--cta').forEach(section => {
      gsap.from(section.querySelector('.cta__content'), {
        scrollTrigger: {
          trigger: section,
          start: 'top 75%',
          once: true
        },
        y: 50,
        opacity: 0,
        duration: 1,
        ease: 'power3.out'
      });
    });
  }

  // Hover effects for interactive elements
  initHoverEffects() {
    // Magnetic effect for buttons
    document.querySelectorAll('[data-magnetic]').forEach(element => {
      element.addEventListener('mousemove', (e) => {
        const rect = element.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        
        gsap.to(element, {
          x: x * 0.3,
          y: y * 0.3,
          duration: 0.3,
          ease: 'power2.out'
        });
      });
      
      element.addEventListener('mouseleave', () => {
        gsap.to(element, {
          x: 0,
          y: 0,
          duration: 0.5,
          ease: 'elastic.out(1, 0.5)'
        });
      });
    });

    // Tilt effect for cards
    document.querySelectorAll('[data-tilt]').forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        
        gsap.to(card, {
          rotateY: x * 10,
          rotateX: -y * 10,
          transformPerspective: 1000,
          duration: 0.3,
          ease: 'power1.out'
        });
      });
      
      card.addEventListener('mouseleave', () => {
        gsap.to(card, {
          rotateY: 0,
          rotateX: 0,
          duration: 0.5,
          ease: 'power2.out'
        });
      });
    });
  }

  // Counter animations for stats
  initCounterAnimations() {
    // Will be triggered by scroll
  }

  animateCounters() {
    document.querySelectorAll('.stat__number').forEach(counter => {
      const target = parseInt(counter.dataset.target) || 0;
      
      gsap.fromTo(counter, 
        { textContent: 0 },
        {
          textContent: target,
          duration: 2,
          ease: 'power2.out',
          snap: { textContent: 1 },
          onUpdate: function() {
            counter.textContent = Math.round(this.targets()[0].textContent);
          }
        }
      );
    });
  }

  // Parallax effects
  initParallaxEffects() {
    gsap.utils.toArray('[data-parallax]').forEach(element => {
      gsap.to(element, {
        scrollTrigger: {
          trigger: element,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 1
        },
        y: -50,
        ease: 'none'
      });
    });
  }

  // Stagger animations
  initStaggerAnimations() {
    // WhatWeDo items
    const whatwedoItems = document.querySelectorAll('.whatwedo__item');
    if (whatwedoItems.length) {
      ScrollTrigger.create({
        trigger: '.whatwedo__list',
        start: 'top 75%',
        once: true,
        onEnter: () => {
          gsap.to(whatwedoItems, {
            x: 0,
            opacity: 1,
            duration: 0.6,
            stagger: 0.1,
            ease: 'power3.out'
          });
        }
      });
    }

    // Service features
    gsap.utils.toArray('.service-detail__features').forEach(list => {
      const items = list.querySelectorAll('li');
      
      ScrollTrigger.create({
        trigger: list,
        start: 'top 80%',
        once: true,
        onEnter: () => {
          gsap.from(items, {
            x: -30,
            opacity: 0,
            duration: 0.5,
            stagger: 0.08,
            ease: 'power2.out'
          });
        }
      });
    });
  }

  // Hero entrance animation
  animateHeroEntrance() {
    const tl = gsap.timeline();
    
    // Hero tag text
    tl.to('.hero__tag-text', {
      y: 0,
      opacity: 1,
      duration: 0.8,
      ease: 'power3.out'
    }, 0.3);
    
    // Hero title words
    const titleWords = document.querySelectorAll('.hero__title-word');
    tl.to(titleWords, {
      y: '0%',
      opacity: 1,
      duration: 1,
      stagger: 0.15,
      ease: 'power3.out'
    }, 0.5);
    
    // Hero description
    tl.to('.hero__description', {
      y: 0,
      opacity: 1,
      duration: 0.8,
      ease: 'power3.out'
    }, 1);
    
    // Hero CTA
    tl.to('.hero__cta', {
      y: 0,
      opacity: 1,
      duration: 0.8,
      ease: 'power3.out'
    }, 1.2);
    
    // Hero scroll indicator
    tl.to('.hero__scroll', {
      y: 0,
      opacity: 1,
      duration: 0.8,
      ease: 'power3.out'
    }, 1.4);
    
    return tl;
  }

  // Page hero entrance animation
  animatePageHeroEntrance() {
    const tl = gsap.timeline();
    
    tl.to('.page-hero__label', {
      y: 0,
      opacity: 1,
      duration: 0.6,
      ease: 'power3.out'
    }, 0.3);
    
    const titleLines = document.querySelectorAll('.page-hero__title-line');
    tl.to(titleLines, {
      y: 0,
      opacity: 1,
      duration: 0.8,
      stagger: 0.1,
      ease: 'power3.out'
    }, 0.4);
    
    tl.to('.page-hero__description', {
      y: 0,
      opacity: 1,
      duration: 0.6,
      ease: 'power3.out'
    }, 0.8);
    
    return tl;
  }

  // Refresh ScrollTrigger (call after Lenis update)
  refresh() {
    ScrollTrigger.refresh();
  }

  // Cleanup
  destroy() {
    if (this.ctx) {
      this.ctx.revert();
    }
    ScrollTrigger.getAll().forEach(st => st.kill());
  }
}
