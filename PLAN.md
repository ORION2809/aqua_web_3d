I’m going to do this like a film director + creative technologist, not like a web dev.

You’ll get two things:

A redesigned HomeScene as a precise 15-second cinematic sequence

ONE signature “illegal” moment with exact math + logic that your agent can implement verbatim

No fluff. No vibes. This is executable.

PART 1 — HOME SCENE
15-Second Cinematic Sequence (Unforgettable)
🎬 Core concept

The website does not start underwater.
The website DROWNS.

This is not scrolling.
This is an event.

⏱️ Timeline Overview (15 seconds total)
Time	Phase	What the user feels
0–2s	Arrival	“This is calm… too calm.”
2–5s	Tension	“Something is wrong.”
5–7s	ILLEGAL MOMENT	“What the hell just happened?”
7–11s	Descent	“I’m inside it now.”
11–15s	Claim	“This site owns me.”
PHASE 0 — PRECONDITION (important)

Before animation starts:

Disable scroll

Disable Lenis

Disable pointer events on DOM

Show only minimal UI (logo maybe, nothing else)

This must feel non-interactive at first.

document.body.classList.add('lock-scroll');
lenis.stop();

PHASE 1 — ARRIVAL (0s → 2s)
Camera
camera.position.set(0, 120, 160);
camera.lookAt(0, 0, 0);
camera.fov = 35;

Scene

Flat water surface

Almost mirror-like

NO particles

NO fog

Silence (visually)

Motion

Extremely slow camera drift:

camera.position.y += Math.sin(time * 0.2) * 0.3;


Psychology:
User thinks: “Okay… premium hero section.”

PHASE 2 — TENSION BUILD (2s → 5s)

This is where most sites stop.
You don’t.

Visual changes

Subtle ripple distortion begins

Horizon line bends (shader UV warp)

Light intensity pulses slightly off-rhythm

float tension = smoothstep(2.0, 5.0, uTime);
uv.y += sin(uv.x * 12.0 + uTime * 2.0) * 0.03 * tension;

Camera

Camera slowly moves towards water, not down:

camera.position.z = lerp(160, 90, t);

UI

Text opacity drops to 0.4

Cursor disappears

Psychology:
User senses loss of control.

PART 2 — THE SIGNATURE ILLEGAL MOMENT (5s → 7s)
🚫 THIS IS THE MOMENT THAT MAKES THE SITE UNFORGETTABLE
RULE YOU ARE BREAKING

A website must never physically overpower its UI.

You will violate this.

🔥 ILLEGAL MOMENT:
“THE WATER SLAMS INTO THE USER”

Not fade.
Not crossfade.
Not scroll.

Impact.

EXACT SEQUENCE (FRAME-ACCURATE)
T = 5.0s — Lock reality
document.body.classList.add('no-pointer');


Disable pointer events

Disable keyboard

Lock scroll harder

T = 5.1s — Camera LUNGE
gsap.to(camera.position, {
  z: 20,
  y: 30,
  duration: 0.4,
  ease: "power4.in"
});


This is intentionally aggressive.

T = 5.4s — Water plane VIOLATES the DOM
CSS (THIS IS CRITICAL)
.canvas-container {
  z-index: 999;
}


Yes.
The canvas comes in front of the UI.

This is illegal.
That’s the point.

T = 5.6s — Surface rupture

In your water shader:

float rupture = smoothstep(5.5, 6.0, uTime);
pos.y -= rupture * 25.0;


The water collapses downward.

T = 5.8s — Camera crosses the plane
camera.position.y = -10;


No easing.
This must feel wrong.

T = 6.0s — UI DROWNS
gsap.to(".hero-content", {
  y: 80,
  opacity: 0,
  duration: 0.3,
  ease: "power2.in"
});


Text sinks.
Not fades.

T = 6.3s — Darkness hit
scene.fog.density = 0.15;
renderer.toneMappingExposure = 0.6;


Everything collapses into blue-black.

T = 6.8s — Event dispatch
window.dispatchEvent(new Event("surfaceBreach"));


This is not cosmetic.
This is narrative.

Psychology:
The user loses orientation.
The website asserts dominance.
This is the memory anchor.

PART 3 — DESCENT & OWNERSHIP (7s → 15s)

Now you reward them.

PHASE 4 — DESCENT (7s → 11s)
Camera
gsap.to(camera.position, {
  y: -160,
  z: 60,
  duration: 4,
  ease: "power1.out"
});

Add:

Particles (slow, vertical)

Light shafts

Depth rings passing by camera

Motion rule

Nothing snaps anymore.
Everything glides.

Psychology:
User accepts the new reality.

PHASE 5 — CLAIM (11s → 15s)
UI returns — but changed

Smaller

Higher contrast

Feels “inside” the world

document.body.classList.add("underwater-mode");

Camera settles
camera.lookAt(0, -120, 0);

Re-enable control
lenis.start();
document.body.classList.remove('lock-scroll');


Now scroll becomes movement through space, not navigation.

WHY THIS WORKS (THIS IS IMPORTANT)

You just did ALL of this:

✅ Broke DOM / Canvas hierarchy
✅ Violated scroll expectations
✅ Forced a non-interactive cinematic beat
✅ Created a shock moment
✅ Changed visual rules permanently
✅ Made the site impossible to mistake for a template

This is how award-winning sites are remembered.

WHAT YOUR AGENT MUST IMPLEMENT (NON-NEGOTIABLE)

Tell them:

If the Home page can be skipped, scrolled, or casually ignored in the first 7 seconds, the implementation is wrong.

FINAL REALITY CHECK

If someone opens the site and says:

“Whoa… what just happened?”

You won.

If they say:

“Nice hero animation.”

You failed.