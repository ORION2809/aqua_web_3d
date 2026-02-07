import * as THREE from 'three';
import gsap from 'gsap';

/**
 * ContactScene - CALM AFTER THE STORM
 * ====================================
 * After the intensity of Home (breach), About (descent), Services (orbit),
 * Contact is the resolution. A peaceful, infinite horizon.
 * 
 * Visual Language:
 * - Vast, calm ocean surface at twilight
 * - Camera floats gently above still water
 * - Bioluminescent glow rises from depths
 * - Stars emerge in the sky
 * - Sense of arrival, completion, openness
 */

export class ContactScene {
    constructor(container, performanceTier = 'medium') {
        this.container = container;
        this.performanceTier = performanceTier;
        this.isActive = false;
        this.animationId = null;
        this.clock = new THREE.Clock();
        
        // Scene state
        this.hasReachedPeace = false;
        this.starsRevealed = false;
        
        // Mouse for gentle parallax
        this.mouse = { x: 0, y: 0 };
        this.targetMouse = { x: 0, y: 0 };
        
        this.init();
    }
    
    init() {
        this.setupRenderer();
        this.setupScene();
        this.setupCamera();
        this.setupLighting();
        this.createInfiniteOcean();
        this.createHorizonGlow();
        this.createStarfield();
        this.createRisingLights();
        this.createAmbientParticles();
        this.setupEventListeners();
    }
    
    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            antialias: this.performanceTier !== 'low',
            alpha: true,
            powerPreference: 'high-performance'
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 
            this.performanceTier === 'high' ? 2 : 1.5));
        this.renderer.setClearColor(0x000000, 0);
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 0.8;
        this.container.appendChild(this.renderer.domElement);
    }
    
    setupScene() {
        this.scene = new THREE.Scene();
        // Twilight fog - purple/blue gradient feel
        this.scene.fog = new THREE.FogExp2(0x0a0a1a, 0.008);
    }
    
    setupCamera() {
        this.camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            0.1,
            2000
        );
        // Camera floats gently above calm water, looking at horizon
        this.camera.position.set(0, 15, 80);
        this.camera.lookAt(0, 0, -500);
        
        this.cameraBasePosition = { x: 0, y: 15, z: 80 };
    }
    
    setupLighting() {
        // Twilight ambient - very soft
        const ambient = new THREE.AmbientLight(0x1a1a2e, 0.3);
        this.scene.add(ambient);
        
        // Horizon glow light (sunset remnant)
        const horizonLight = new THREE.DirectionalLight(0xff6b35, 0.4);
        horizonLight.position.set(0, 5, -200);
        this.scene.add(horizonLight);
        
        // Moonlight from above
        const moonLight = new THREE.DirectionalLight(0xaaccff, 0.3);
        moonLight.position.set(50, 100, 50);
        this.scene.add(moonLight);
        
        // Bioluminescent glow from below
        const bioLight = new THREE.PointLight(0x00ffaa, 0.5, 100);
        bioLight.position.set(0, -30, 0);
        this.scene.add(bioLight);
        this.bioLight = bioLight;
    }
    
    createInfiniteOcean() {
        // Vast, calm ocean surface
        const oceanGeometry = new THREE.PlaneGeometry(2000, 2000, 128, 128);
        
        const oceanMaterial = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uColorDeep: { value: new THREE.Color(0x0a0a1a) },
                uColorSurface: { value: new THREE.Color(0x1a3a5c) },
                uColorReflection: { value: new THREE.Color(0x2a4a6c) }
            },
            vertexShader: `
                uniform float uTime;
                varying vec2 vUv;
                varying float vElevation;
                
                void main() {
                    vUv = uv;
                    vec3 pos = position;
                    
                    // Very gentle waves - this is CALM water
                    float wave1 = sin(pos.x * 0.02 + uTime * 0.3) * 0.5;
                    float wave2 = sin(pos.y * 0.015 + uTime * 0.2) * 0.3;
                    float wave3 = sin((pos.x + pos.y) * 0.01 + uTime * 0.4) * 0.2;
                    
                    pos.z = wave1 + wave2 + wave3;
                    vElevation = pos.z;
                    
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 uColorDeep;
                uniform vec3 uColorSurface;
                uniform vec3 uColorReflection;
                uniform float uTime;
                varying vec2 vUv;
                varying float vElevation;
                
                void main() {
                    // Distance-based depth
                    float dist = length(vUv - 0.5);
                    
                    // Blend deep to surface based on camera distance
                    vec3 color = mix(uColorSurface, uColorDeep, dist);
                    
                    // Subtle reflection highlights on wave peaks
                    float highlight = smoothstep(0.2, 0.8, vElevation + 0.5);
                    color = mix(color, uColorReflection, highlight * 0.3);
                    
                    // Horizon fade
                    float horizonFade = smoothstep(0.0, 0.5, 1.0 - vUv.y);
                    
                    gl_FragColor = vec4(color, 0.9 * horizonFade);
                }
            `,
            transparent: true,
            side: THREE.DoubleSide
        });
        
        this.ocean = new THREE.Mesh(oceanGeometry, oceanMaterial);
        this.ocean.rotation.x = -Math.PI / 2;
        this.ocean.position.y = 0;
        this.scene.add(this.ocean);
    }
    
    createHorizonGlow() {
        // Ethereal horizon glow - twilight remnant
        const glowGeometry = new THREE.PlaneGeometry(2000, 200);
        
        const glowMaterial = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uColor1: { value: new THREE.Color(0xff6b35) }, // Sunset orange
                uColor2: { value: new THREE.Color(0x9b59b6) }, // Purple
                uColor3: { value: new THREE.Color(0x0a0a1a) }  // Night
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float uTime;
                uniform vec3 uColor1;
                uniform vec3 uColor2;
                uniform vec3 uColor3;
                varying vec2 vUv;
                
                void main() {
                    // Vertical gradient: orange at bottom, purple, then night
                    vec3 color = mix(uColor1, uColor2, vUv.y);
                    color = mix(color, uColor3, pow(vUv.y, 0.5));
                    
                    // Pulsing glow
                    float pulse = sin(uTime * 0.5) * 0.1 + 0.9;
                    
                    // Fade at edges
                    float edgeFade = 1.0 - pow(abs(vUv.x - 0.5) * 2.0, 2.0);
                    float alpha = (1.0 - vUv.y) * edgeFade * pulse * 0.6;
                    
                    gl_FragColor = vec4(color, alpha);
                }
            `,
            transparent: true,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        
        this.horizonGlow = new THREE.Mesh(glowGeometry, glowMaterial);
        this.horizonGlow.position.set(0, 50, -600);
        this.scene.add(this.horizonGlow);
    }
    
    createStarfield() {
        // Stars that emerge as night settles
        const starCount = this.performanceTier === 'high' ? 2000 : 
                         this.performanceTier === 'medium' ? 1000 : 500;
        
        const positions = new Float32Array(starCount * 3);
        const sizes = new Float32Array(starCount);
        const twinkle = new Float32Array(starCount);
        
        for (let i = 0; i < starCount; i++) {
            // Hemisphere above camera
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI * 0.4; // Upper hemisphere only
            const radius = 400 + Math.random() * 400;
            
            positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = radius * Math.cos(phi) + 100;
            positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta) - 200;
            
            sizes[i] = Math.random() * 2 + 0.5;
            twinkle[i] = Math.random() * Math.PI * 2;
        }
        
        const starGeometry = new THREE.BufferGeometry();
        starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        starGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        starGeometry.setAttribute('twinkle', new THREE.BufferAttribute(twinkle, 1));
        
        const starMaterial = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uOpacity: { value: 0 } // Stars fade in
            },
            vertexShader: `
                attribute float size;
                attribute float twinkle;
                uniform float uTime;
                varying float vTwinkle;
                
                void main() {
                    vTwinkle = twinkle;
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = size * (300.0 / -mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                uniform float uTime;
                uniform float uOpacity;
                varying float vTwinkle;
                
                void main() {
                    vec2 center = gl_PointCoord - 0.5;
                    float dist = length(center);
                    if (dist > 0.5) discard;
                    
                    // Soft glow
                    float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
                    
                    // Twinkle effect
                    float twinkle = sin(uTime * 2.0 + vTwinkle) * 0.3 + 0.7;
                    
                    gl_FragColor = vec4(1.0, 1.0, 1.0, alpha * twinkle * uOpacity);
                }
            `,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });
        
        this.stars = new THREE.Points(starGeometry, starMaterial);
        this.scene.add(this.stars);
    }
    
    createRisingLights() {
        // Bioluminescent lights that rise from the depths
        const lightCount = this.performanceTier === 'high' ? 50 : 
                          this.performanceTier === 'medium' ? 30 : 15;
        
        this.risingLights = [];
        
        const lightGeometry = new THREE.SphereGeometry(0.5, 8, 8);
        
        for (let i = 0; i < lightCount; i++) {
            const hue = 0.4 + Math.random() * 0.2; // Cyan to green range
            const color = new THREE.Color().setHSL(hue, 0.8, 0.6);
            
            const lightMaterial = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 0
            });
            
            const light = new THREE.Mesh(lightGeometry, lightMaterial);
            
            // Random positions spread across the ocean
            light.position.x = (Math.random() - 0.5) * 200;
            light.position.y = -50 - Math.random() * 50; // Start deep
            light.position.z = (Math.random() - 0.5) * 200 - 50;
            
            // Store animation parameters
            light.userData = {
                speed: 0.2 + Math.random() * 0.3,
                phase: Math.random() * Math.PI * 2,
                maxY: 5 + Math.random() * 10,
                startY: light.position.y,
                drift: (Math.random() - 0.5) * 0.02
            };
            
            this.risingLights.push(light);
            this.scene.add(light);
            
            // Add glow sprite
            const glowSprite = this.createGlowSprite(color);
            glowSprite.scale.setScalar(3);
            light.add(glowSprite);
        }
    }
    
    createGlowSprite(color) {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        
        const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        gradient.addColorStop(0, `rgba(${color.r * 255}, ${color.g * 255}, ${color.b * 255}, 1)`);
        gradient.addColorStop(0.4, `rgba(${color.r * 255}, ${color.g * 255}, ${color.b * 255}, 0.3)`);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 64, 64);
        
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            blending: THREE.AdditiveBlending
        });
        
        return new THREE.Sprite(material);
    }
    
    createAmbientParticles() {
        // Gentle floating particles - fireflies of the sea
        const particleCount = this.performanceTier === 'high' ? 200 : 
                             this.performanceTier === 'medium' ? 100 : 50;
        
        const positions = new Float32Array(particleCount * 3);
        const velocities = [];
        
        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 150;
            positions[i * 3 + 1] = Math.random() * 40;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 150;
            
            velocities.push({
                x: (Math.random() - 0.5) * 0.02,
                y: (Math.random() - 0.5) * 0.01,
                z: (Math.random() - 0.5) * 0.02
            });
        }
        
        this.particleVelocities = velocities;
        
        const particleGeometry = new THREE.BufferGeometry();
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        const particleMaterial = new THREE.PointsMaterial({
            color: 0x88ccff,
            size: 0.8,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending
        });
        
        this.ambientParticles = new THREE.Points(particleGeometry, particleMaterial);
        this.scene.add(this.ambientParticles);
    }
    
    setupEventListeners() {
        this.boundMouseMove = this.onMouseMove.bind(this);
        this.boundResize = this.onResize.bind(this);
        
        window.addEventListener('mousemove', this.boundMouseMove);
        window.addEventListener('resize', this.boundResize);
    }
    
    onMouseMove(e) {
        this.targetMouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        this.targetMouse.y = (e.clientY / window.innerHeight) * 2 - 1;
    }
    
    onResize() {
        if (!this.camera || !this.renderer) return;
        
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    start() {
        if (this.isActive) return;
        this.isActive = true;
        this.clock.start();
        this.animate();
        this.playEntryAnimation();
    }
    
    playEntryAnimation() {
        // Camera gently settles into position
        gsap.fromTo(this.camera.position,
            { y: 30, z: 120 },
            { 
                y: 15, 
                z: 80, 
                duration: 3, 
                ease: 'power2.out' 
            }
        );
        
        // Stars fade in after a moment
        gsap.to(this.stars.material.uniforms.uOpacity, {
            value: 1,
            duration: 4,
            delay: 1.5,
            ease: 'power2.inOut',
            onComplete: () => {
                this.starsRevealed = true;
                window.dispatchEvent(new CustomEvent('starsRevealed'));
            }
        });
        
        // Rising lights begin their journey
        this.risingLights.forEach((light, i) => {
            gsap.to(light.material, {
                opacity: 0.8,
                duration: 2,
                delay: 2 + i * 0.1,
                ease: 'power2.out'
            });
        });
        
        // Trigger peace event
        setTimeout(() => {
            if (!this.hasReachedPeace) {
                this.hasReachedPeace = true;
                window.dispatchEvent(new CustomEvent('peaceReached'));
            }
        }, 4000);
    }
    
    stop() {
        this.isActive = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }
    
    animate() {
        if (!this.isActive) return;
        
        this.animationId = requestAnimationFrame(() => this.animate());
        
        const time = this.clock.getElapsedTime();
        
        // Smooth mouse following
        this.mouse.x += (this.targetMouse.x - this.mouse.x) * 0.02;
        this.mouse.y += (this.targetMouse.y - this.mouse.y) * 0.02;
        
        // Gentle camera sway - like floating on calm water
        this.camera.position.x = this.cameraBasePosition.x + this.mouse.x * 8;
        this.camera.position.y = this.cameraBasePosition.y + Math.sin(time * 0.3) * 0.5 + this.mouse.y * 3;
        
        // Very subtle camera rotation
        this.camera.rotation.z = this.mouse.x * 0.01;
        
        // Update ocean waves
        if (this.ocean) {
            this.ocean.material.uniforms.uTime.value = time;
        }
        
        // Update horizon glow
        if (this.horizonGlow) {
            this.horizonGlow.material.uniforms.uTime.value = time;
        }
        
        // Update stars
        if (this.stars) {
            this.stars.material.uniforms.uTime.value = time;
        }
        
        // Animate rising lights
        this.risingLights.forEach(light => {
            const data = light.userData;
            
            // Rise slowly
            light.position.y += data.speed * 0.1;
            
            // Gentle horizontal drift
            light.position.x += Math.sin(time + data.phase) * data.drift;
            
            // Reset when they reach the surface
            if (light.position.y > data.maxY) {
                light.position.y = data.startY;
                light.material.opacity = 0;
                gsap.to(light.material, { opacity: 0.8, duration: 1 });
            }
        });
        
        // Animate ambient particles
        if (this.ambientParticles) {
            const positions = this.ambientParticles.geometry.attributes.position.array;
            for (let i = 0; i < positions.length / 3; i++) {
                const vel = this.particleVelocities[i];
                positions[i * 3] += vel.x;
                positions[i * 3 + 1] += vel.y + Math.sin(time + i) * 0.005;
                positions[i * 3 + 2] += vel.z;
                
                // Wrap around
                if (Math.abs(positions[i * 3]) > 75) vel.x *= -1;
                if (positions[i * 3 + 1] > 50 || positions[i * 3 + 1] < 0) vel.y *= -1;
                if (Math.abs(positions[i * 3 + 2]) > 75) vel.z *= -1;
            }
            this.ambientParticles.geometry.attributes.position.needsUpdate = true;
        }
        
        // Pulse bioluminescent light
        if (this.bioLight) {
            this.bioLight.intensity = 0.5 + Math.sin(time * 0.5) * 0.2;
        }
        
        this.renderer.render(this.scene, this.camera);
    }
    
    destroy() {
        this.stop();
        
        window.removeEventListener('mousemove', this.boundMouseMove);
        window.removeEventListener('resize', this.boundResize);
        
        // Dispose geometries and materials
        this.scene.traverse(obj => {
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
                if (Array.isArray(obj.material)) {
                    obj.material.forEach(m => m.dispose());
                } else {
                    obj.material.dispose();
                }
            }
        });
        
        this.renderer.dispose();
        
        if (this.renderer.domElement.parentNode) {
            this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
        }
    }
}
