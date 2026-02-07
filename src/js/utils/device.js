/**
 * Aurora Aqua - Device Detection Utilities
 */

export function isMobile() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
    || window.innerWidth < 768;
}

export function isTablet() {
  return /iPad|Android/i.test(navigator.userAgent) && window.innerWidth >= 768 && window.innerWidth < 1024;
}

export function isTouch() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

export function getDevicePixelRatio() {
  // Limit pixel ratio for performance
  return Math.min(window.devicePixelRatio, isMobile() ? 1.5 : 2);
}

export function supportsWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && 
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
  } catch (e) {
    return false;
  }
}

export function getPerformanceTier() {
  // Returns 'low', 'medium', or 'high' based on device capabilities
  const mobile = isMobile();
  const pixelRatio = window.devicePixelRatio;
  const memory = navigator.deviceMemory || 4;
  const cores = navigator.hardwareConcurrency || 4;
  
  if (mobile || memory <= 2 || cores <= 2) {
    return 'low';
  } else if (memory <= 4 || cores <= 4) {
    return 'medium';
  }
  return 'high';
}
