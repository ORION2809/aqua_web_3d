/**
 * Aurora Aqua - Navigation
 * Mobile menu toggle and scroll behavior
 */

import gsap from 'gsap';

export class Navigation {
  constructor() {
    this.header = document.querySelector('.header');
    this.toggle = document.getElementById('nav-toggle');
    this.mobileMenu = document.getElementById('mobile-menu');
    this.isMenuOpen = false;
    this.lastScrollY = 0;
    
    this.init();
  }

  init() {
    this.setupMobileMenu();
    this.setupScrollBehavior();
    this.setupActiveLinks();
  }

  setupMobileMenu() {
    if (!this.toggle || !this.mobileMenu) return;

    this.toggle.addEventListener('click', () => {
      this.toggleMenu();
    });

    // Close menu on link click
    const menuLinks = this.mobileMenu.querySelectorAll('.mobile-menu__link');
    menuLinks.forEach(link => {
      link.addEventListener('click', () => {
        this.closeMenu();
      });
    });

    // Close on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isMenuOpen) {
        this.closeMenu();
      }
    });
  }

  toggleMenu() {
    if (this.isMenuOpen) {
      this.closeMenu();
    } else {
      this.openMenu();
    }
  }

  openMenu() {
    this.isMenuOpen = true;
    this.toggle.classList.add('is-active');
    this.mobileMenu.classList.add('is-open');
    document.body.classList.add('no-scroll');

    // Animate menu links
    const links = this.mobileMenu.querySelectorAll('.mobile-menu__link');
    gsap.fromTo(links, 
      { y: 30, opacity: 0 },
      { 
        y: 0, 
        opacity: 1, 
        duration: 0.5, 
        stagger: 0.1,
        ease: 'power3.out',
        delay: 0.2
      }
    );
  }

  closeMenu() {
    this.isMenuOpen = false;
    this.toggle.classList.remove('is-active');
    this.mobileMenu.classList.remove('is-open');
    document.body.classList.remove('no-scroll');
  }

  setupScrollBehavior() {
    window.addEventListener('scroll', () => {
      const scrollY = window.scrollY;

      // Add background on scroll
      if (scrollY > 50) {
        this.header.classList.add('is-scrolled');
      } else {
        this.header.classList.remove('is-scrolled');
      }

      this.lastScrollY = scrollY;
    }, { passive: true });
  }

  setupActiveLinks() {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav__link, .mobile-menu__link');

    navLinks.forEach(link => {
      const href = link.getAttribute('href');
      
      // Remove all active classes first
      link.classList.remove('active');
      
      // Check for match
      if (
        (currentPath === '/' && (href === '/' || href === '/index.html')) ||
        (currentPath.includes('about') && href.includes('about')) ||
        (currentPath.includes('services') && href.includes('services')) ||
        (currentPath.includes('contact') && href.includes('contact'))
      ) {
        link.classList.add('active');
      }
    });
  }

  // Call after page transition
  refresh() {
    this.setupActiveLinks();
    this.closeMenu();
  }
}
