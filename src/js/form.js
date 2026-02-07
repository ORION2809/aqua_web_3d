/**
 * Aurora Aqua - Form Handler
 * Contact form validation and submission
 */

import gsap from 'gsap';

export class FormHandler {
  constructor(formSelector = '#contact-form') {
    this.form = document.querySelector(formSelector);
    if (!this.form) return;

    this.submitBtn = this.form.querySelector('.btn');
    this.fields = {};
    
    this.init();
  }

  init() {
    this.setupFields();
    this.setupValidation();
    this.setupSubmission();
    this.setupFocusEffects();
  }

  setupFields() {
    const inputs = this.form.querySelectorAll('input, textarea, select');
    
    inputs.forEach(input => {
      const name = input.name;
      if (name) {
        this.fields[name] = {
          element: input,
          group: input.closest('.form-group'),
          isValid: false
        };
      }
    });
  }

  setupValidation() {
    Object.keys(this.fields).forEach(name => {
      const field = this.fields[name];
      const input = field.element;

      // Real-time validation on blur
      input.addEventListener('blur', () => {
        this.validateField(name);
      });

      // Remove error on input
      input.addEventListener('input', () => {
        this.clearError(name);
      });
    });
  }

  validateField(name) {
    const field = this.fields[name];
    const input = field.element;
    const value = input.value.trim();
    let isValid = true;
    let errorMessage = '';

    // Required check
    if (input.required && !value) {
      isValid = false;
      errorMessage = 'This field is required';
    }
    // Email validation
    else if (input.type === 'email' && value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        isValid = false;
        errorMessage = 'Please enter a valid email address';
      }
    }
    // Phone validation
    else if (input.type === 'tel' && value) {
      const phoneRegex = /^[\d\s\-+()]{10,}$/;
      if (!phoneRegex.test(value)) {
        isValid = false;
        errorMessage = 'Please enter a valid phone number';
      }
    }
    // Min length check
    else if (input.minLength > 0 && value.length < input.minLength) {
      isValid = false;
      errorMessage = `Minimum ${input.minLength} characters required`;
    }

    field.isValid = isValid;

    if (!isValid) {
      this.showError(name, errorMessage);
    } else {
      this.clearError(name);
    }

    return isValid;
  }

  showError(name, message) {
    const field = this.fields[name];
    const group = field.group;
    
    if (!group) return;

    group.classList.add('has-error');
    group.classList.remove('is-valid');

    let errorEl = group.querySelector('.form-error');
    if (!errorEl) {
      errorEl = document.createElement('span');
      errorEl.className = 'form-error';
      group.appendChild(errorEl);
    }

    errorEl.textContent = message;
    
    gsap.fromTo(errorEl, 
      { opacity: 0, y: -10 },
      { opacity: 1, y: 0, duration: 0.3 }
    );
  }

  clearError(name) {
    const field = this.fields[name];
    const group = field.group;
    
    if (!group) return;

    group.classList.remove('has-error');
    
    if (field.element.value.trim()) {
      group.classList.add('is-valid');
    }

    const errorEl = group.querySelector('.form-error');
    if (errorEl) {
      gsap.to(errorEl, {
        opacity: 0,
        y: -10,
        duration: 0.2,
        onComplete: () => errorEl.remove()
      });
    }
  }

  setupSubmission() {
    this.form.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Validate all fields
      let isFormValid = true;
      Object.keys(this.fields).forEach(name => {
        if (!this.validateField(name)) {
          isFormValid = false;
        }
      });

      if (!isFormValid) {
        this.shakeForm();
        return;
      }

      // Submit form
      await this.submitForm();
    });
  }

  shakeForm() {
    gsap.to(this.form, {
      x: [-10, 10, -10, 10, 0],
      duration: 0.4,
      ease: 'power2.out'
    });
  }

  async submitForm() {
    // Show loading state
    this.submitBtn.classList.add('is-loading');
    this.submitBtn.disabled = true;

    // Collect form data
    const formData = new FormData(this.form);
    const data = Object.fromEntries(formData.entries());

    try {
      // Simulate API call (replace with actual endpoint)
      await this.simulateSubmission(data);
      
      // Success
      this.showSuccess();
    } catch (error) {
      this.showSubmitError(error.message);
    } finally {
      this.submitBtn.classList.remove('is-loading');
      this.submitBtn.disabled = false;
    }
  }

  simulateSubmission(data) {
    return new Promise((resolve, reject) => {
      console.log('Form submitted:', data);
      
      // Simulate network delay
      setTimeout(() => {
        // Simulate success (80% success rate for demo)
        if (Math.random() > 0.2) {
          resolve({ success: true });
        } else {
          reject(new Error('Network error. Please try again.'));
        }
      }, 1500);
    });
  }

  showSuccess() {
    // Hide form
    gsap.to(this.form, {
      opacity: 0,
      y: 20,
      duration: 0.4,
      onComplete: () => {
        this.form.style.display = 'none';
        
        // Show success message
        const successEl = document.createElement('div');
        successEl.className = 'form-success';
        successEl.innerHTML = `
          <div class="form-success__icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
          <h3 class="form-success__title">Thank You!</h3>
          <p class="form-success__text">Your message has been sent successfully. We'll get back to you within 24 hours.</p>
          <button class="btn btn--outline" onclick="location.reload()">Send Another Message</button>
        `;
        
        this.form.parentNode.appendChild(successEl);
        
        gsap.from(successEl, {
          opacity: 0,
          y: 20,
          duration: 0.5,
          ease: 'power3.out'
        });

        gsap.from(successEl.querySelector('.form-success__icon'), {
          scale: 0,
          rotation: -180,
          duration: 0.6,
          delay: 0.2,
          ease: 'back.out(2)'
        });
      }
    });
  }

  showSubmitError(message) {
    // Show error notification
    const errorNotification = document.createElement('div');
    errorNotification.className = 'form-notification form-notification--error';
    errorNotification.textContent = message;
    
    document.body.appendChild(errorNotification);
    
    gsap.fromTo(errorNotification,
      { opacity: 0, y: 50, x: '-50%' },
      { 
        opacity: 1, 
        y: 0, 
        duration: 0.4,
        ease: 'power3.out'
      }
    );

    setTimeout(() => {
      gsap.to(errorNotification, {
        opacity: 0,
        y: 50,
        duration: 0.3,
        onComplete: () => errorNotification.remove()
      });
    }, 4000);
  }

  setupFocusEffects() {
    const groups = this.form.querySelectorAll('.form-group');
    
    groups.forEach(group => {
      const input = group.querySelector('input, textarea, select');
      
      if (input) {
        input.addEventListener('focus', () => {
          group.classList.add('is-focused');
        });
        
        input.addEventListener('blur', () => {
          group.classList.remove('is-focused');
        });
      }
    });
  }
}

// Auto-initialize on contact page
if (document.getElementById('contact-form')) {
  new FormHandler('#contact-form');
}

export default FormHandler;
