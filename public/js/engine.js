/* ============================================================
   Evan's Lounge -- Interactive Engine
   GSAP-powered animations, particles, synthesized sounds,
   and cinematic page transitions.
   ============================================================ */

(function () {
  'use strict';

  /* ---- Feature flags / state ---- */
  const STATE = {
    soundEnabled: localStorage.getItem('ep_sound') !== 'off',
    particlesInited: false,
    isTransitioning: false,
    lastHoverTime: 0,
  };

  const HOVER_COOLDOWN = 350; // ms between hover sounds

  /* ==========================================================
     1. SOUND ENGINE  (Web Audio API)
     ========================================================== */
  const Sound = (() => {
    let ctx;
    function getCtx() {
      if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
      return ctx;
    }

    function play(type) {
      if (!STATE.soundEnabled) return;
      try {
        const c = getCtx();
        if (c.state === 'suspended') c.resume();

        const now = c.currentTime;
        switch (type) {
          case 'hover': {
            // Cooldown check
            const t = Date.now();
            if (t - STATE.lastHoverTime < HOVER_COOLDOWN) return;
            STATE.lastHoverTime = t;

            const osc = c.createOscillator();
            const gain = c.createGain();
            osc.connect(gain);
            gain.connect(c.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(2200, now);
            osc.frequency.exponentialRampToValueAtTime(1800, now + 0.06);
            gain.gain.setValueAtTime(0.03, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
            osc.start(now);
            osc.stop(now + 0.07);
            break;
          }

          case 'click': {
            // Soft thud / tap sound
            const osc = c.createOscillator();
            const gain = c.createGain();
            osc.connect(gain);
            gain.connect(c.destination);
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.exponentialRampToValueAtTime(300, now + 0.08);
            gain.gain.setValueAtTime(0.06, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
            break;
          }

          case 'whoosh': {
            const bufLen = c.sampleRate * 0.35;
            const buf = c.createBuffer(1, bufLen, c.sampleRate);
            const data = buf.getChannelData(0);
            for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufLen);
            const noise = c.createBufferSource();
            noise.buffer = buf;
            const bpf = c.createBiquadFilter();
            bpf.type = 'bandpass';
            bpf.frequency.setValueAtTime(1000, now);
            bpf.frequency.exponentialRampToValueAtTime(4000, now + 0.15);
            bpf.frequency.exponentialRampToValueAtTime(800, now + 0.35);
            bpf.Q.value = 0.5;
            const g = c.createGain();
            g.gain.setValueAtTime(0.12, now);
            g.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
            noise.connect(bpf);
            bpf.connect(g);
            g.connect(c.destination);
            noise.start(now);
            noise.stop(now + 0.35);
            break;
          }

          case 'back': {
            const osc = c.createOscillator();
            const gain = c.createGain();
            osc.connect(gain);
            gain.connect(c.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.exponentialRampToValueAtTime(800, now + 0.15);
            gain.gain.setValueAtTime(0.06, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
            osc.start(now);
            osc.stop(now + 0.2);
            break;
          }
        }
      } catch (e) { /* silent fail */ }
    }

    return { play };
  })();

  window.EvSound = Sound;

  /* ==========================================================
     2. HOVER SOUND on interactive elements (with cooldown)
     ========================================================== */
  function initHoverSounds() {
    const interactiveSelector = 'a, button, .card, .section-card, [data-hover]';

    document.addEventListener('mouseover', (e) => {
      if (e.target.closest(interactiveSelector)) {
        Sound.play('hover');
      }
    });
  }

  /* ==========================================================
     3. PARTICLE BACKGROUND (Canvas)
     ========================================================== */
  function initParticles() {
    const canvas = document.getElementById('ev-particles');
    if (!canvas || STATE.particlesInited) return;
    STATE.particlesInited = true;

    const ctx2d = canvas.getContext('2d');
    let W, H;
    let particles = [];
    let mouse = { x: -9999, y: -9999 };
    const PARTICLE_COUNT = Math.min(80, Math.floor(window.innerWidth / 18));
    const CONNECT_DIST = 140;
    const MOUSE_RADIUS = 160;

    function resize() {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    document.addEventListener('mousemove', (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    });
    document.addEventListener('mouseleave', () => {
      mouse.x = -9999;
      mouse.y = -9999;
    });

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r: Math.random() * 1.8 + 0.6,
        alpha: Math.random() * 0.4 + 0.1,
      });
    }

    function draw() {
      ctx2d.clearRect(0, 0, W, H);

      const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#7c8db5';
      const rgb = hexToRgb(accent);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MOUSE_RADIUS && dist > 0) {
          const force = (MOUSE_RADIUS - dist) / MOUSE_RADIUS;
          p.vx += (dx / dist) * force * 0.3;
          p.vy += (dy / dist) * force * 0.3;
        }

        p.vx *= 0.98;
        p.vy *= 0.98;
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = W;
        if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H;
        if (p.y > H) p.y = 0;

        ctx2d.beginPath();
        ctx2d.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx2d.fillStyle = `rgba(${rgb}, ${p.alpha})`;
        ctx2d.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const ddx = p.x - p2.x;
          const ddy = p.y - p2.y;
          const d = Math.sqrt(ddx * ddx + ddy * ddy);
          if (d < CONNECT_DIST) {
            ctx2d.beginPath();
            ctx2d.moveTo(p.x, p.y);
            ctx2d.lineTo(p2.x, p2.y);
            ctx2d.strokeStyle = `rgba(${rgb}, ${0.08 * (1 - d / CONNECT_DIST)})`;
            ctx2d.lineWidth = 0.6;
            ctx2d.stroke();
          }
        }
      }

      requestAnimationFrame(draw);
    }
    draw();
  }

  function hexToRgb(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
    const n = parseInt(hex, 16);
    return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
  }

  /* ==========================================================
     4. PAGE TRANSITIONS  (GSAP-powered zoom/fade)
     ========================================================== */
  function initTransitions() {
    if (typeof gsap === 'undefined') return;

    const wrapper = document.querySelector('.page-transition-wrapper');
    if (!wrapper) return;

    // --- Enter animation ---
    const transData = sessionStorage.getItem('ev_transition');
    if (transData) {
      sessionStorage.removeItem('ev_transition');
      const data = JSON.parse(transData);

      // Start hidden to prevent flicker
      gsap.set(wrapper, { opacity: 0 });

      if (data.type === 'zoom-in') {
        gsap.set(wrapper, { scale: 0.92, transformOrigin: 'center center' });
        gsap.to(wrapper, {
          scale: 1,
          opacity: 1,
          duration: 0.6,
          ease: 'power2.out',
          delay: 0.05,
        });
      } else if (data.type === 'zoom-out') {
        gsap.set(wrapper, { scale: 1.08 });
        gsap.to(wrapper, {
          scale: 1,
          opacity: 1,
          duration: 0.5,
          ease: 'power2.out',
          delay: 0.05,
        });
      }
    } else {
      // Default page-load animation
      gsap.set(wrapper, { opacity: 0 });
      gsap.to(wrapper, {
        opacity: 1,
        y: 0,
        duration: 0.5,
        ease: 'power2.out',
        delay: 0.05,
      });
    }

    // --- Intercept navigation links for zoom transition ---
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href]');
      if (!link) return;

      const href = link.getAttribute('href');
      if (!href || href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto') || href.startsWith('javascript')) return;
      if (link.target === '_blank') return;
      if (STATE.isTransitioning) { e.preventDefault(); return; }

      e.preventDefault();
      STATE.isTransitioning = true;
      Sound.play('whoosh');

      const isBack = link.classList.contains('back-btn') || link.dataset.transition === 'back';
      const transType = isBack ? 'zoom-out' : 'zoom-in';

      sessionStorage.setItem('ev_transition', JSON.stringify({ type: transType }));

      const tl = gsap.timeline({
        onComplete: () => { window.location.href = href; },
      });

      if (isBack) {
        Sound.play('back');
        tl.to(wrapper, {
          scale: 0.92,
          opacity: 0,
          duration: 0.4,
          ease: 'power2.in',
        });
      } else {
        tl.to(wrapper, {
          scale: 1.05,
          opacity: 0,
          duration: 0.4,
          ease: 'power2.in',
        });
      }
    });
  }

  /* ==========================================================
     5. HOMEPAGE FULL-SCREEN SECTIONS
     ========================================================== */
  function initHomeSections() {
    const sections = document.querySelectorAll('.section-card');
    if (!sections.length || typeof gsap === 'undefined') return;

    // Parallax on mouse move
    document.addEventListener('mousemove', (e) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;

      sections.forEach((sec) => {
        const inner = sec.querySelector('.section-inner');
        if (inner) {
          gsap.to(inner, {
            x: x * 12,
            y: y * 8,
            duration: 0.8,
            ease: 'power2.out',
          });
        }
        const bg = sec.querySelector('.section-bg-text');
        if (bg) {
          gsap.to(bg, {
            x: x * -20,
            y: y * -15,
            duration: 1.2,
            ease: 'power2.out',
          });
        }
      });
    });

    // Zoom-in click on section cards
    sections.forEach((sec) => {
      const href = sec.dataset.href;
      if (!href) return;

      sec.addEventListener('click', (e) => {
        if (STATE.isTransitioning) return;
        e.preventDefault();
        STATE.isTransitioning = true;

        Sound.play('click');
        Sound.play('whoosh');

        sessionStorage.setItem('ev_transition', JSON.stringify({ type: 'zoom-in' }));

        const rect = sec.getBoundingClientRect();
        const ox = rect.left + rect.width / 2;
        const oy = rect.top + rect.height / 2;

        const wrapper = document.querySelector('.home-wrapper') || document.body;

        gsap.to(wrapper, {
          scale: 1.5,
          opacity: 0,
          duration: 0.6,
          ease: 'power3.in',
          transformOrigin: `${ox}px ${oy}px`,
          onComplete: () => { window.location.href = href; },
        });
      });
    });
  }

  /* ==========================================================
     6. SCROLL ANIMATIONS (GSAP ScrollTrigger)
     ========================================================== */
  function initScrollAnimations() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
    gsap.registerPlugin(ScrollTrigger);

    gsap.utils.toArray('.gsap-reveal').forEach((el) => {
      gsap.from(el, {
        scrollTrigger: { trigger: el, start: 'top 85%', once: true },
        opacity: 0,
        y: 40,
        duration: 0.8,
        ease: 'power2.out',
      });
    });

    gsap.utils.toArray('.gsap-stagger-parent').forEach((parent) => {
      const children = parent.querySelectorAll('.gsap-stagger');
      gsap.from(children, {
        scrollTrigger: { trigger: parent, start: 'top 80%', once: true },
        opacity: 0,
        y: 30,
        stagger: 0.1,
        duration: 0.6,
        ease: 'power2.out',
      });
    });
  }

  /* ==========================================================
     7. MAGNETIC BUTTONS
     ========================================================== */
  function initMagnetic() {
    if (window.innerWidth < 768) return;

    document.querySelectorAll('.magnetic').forEach((btn) => {
      btn.addEventListener('mousemove', (e) => {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        gsap.to(btn, { x: x * 0.25, y: y * 0.25, duration: 0.3, ease: 'power2.out' });
      });

      btn.addEventListener('mouseleave', () => {
        gsap.to(btn, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1, 0.4)' });
      });
    });
  }

  /* ==========================================================
     8. THEME (always dark, no toggle)
     ========================================================== */
  function initTheme() {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('ep_theme', 'dark');
  }

  window.toggleSound = function () {
    STATE.soundEnabled = !STATE.soundEnabled;
    localStorage.setItem('ep_sound', STATE.soundEnabled ? 'on' : 'off');
    if (STATE.soundEnabled) Sound.play('click');
    const btn = document.querySelector('.sound-toggle');
    if (btn) btn.textContent = STATE.soundEnabled ? 'Sound On' : 'Sound Off';
  };

  /* ==========================================================
     INIT
     ========================================================== */
  function init() {
    initTheme();
    initHoverSounds();
    initParticles();
    initTransitions();
    initHomeSections();
    initMagnetic();

    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
      initScrollAnimations();
    } else {
      window.addEventListener('load', initScrollAnimations);
    }

    const soundBtn = document.querySelector('.sound-toggle');
    if (soundBtn) soundBtn.textContent = STATE.soundEnabled ? 'Sound On' : 'Sound Off';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
