/* ============================================================
   Evan's Dungeon -- Interactive Engine v2
   Unseen-inspired: ink transitions, slide menu, typewriter sounds,
   parallax background, hover flip animations.
   ============================================================ */

(function () {
  'use strict';

  var STATE = {
    soundEnabled: localStorage.getItem('ep_sound') !== 'off',
    particlesInited: false,
    isTransitioning: false,
    lastHoverTime: 0,
    lastTypeTime: 0,
    menuOpen: false,
  };

  var HOVER_COOLDOWN = 350;
  var TYPE_COOLDOWN = 60;

  /* ==========================================================
     1. SOUND ENGINE (Web Audio API)
     ========================================================== */
  var Sound = (function () {
    var ctx;
    function getCtx() {
      if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
      return ctx;
    }

    function play(type) {
      if (!STATE.soundEnabled) return;
      try {
        var c = getCtx();
        if (c.state === 'suspended') c.resume();
        var now = c.currentTime;

        switch (type) {
          case 'hover': {
            var t = Date.now();
            if (t - STATE.lastHoverTime < HOVER_COOLDOWN) return;
            STATE.lastHoverTime = t;
            var osc = c.createOscillator();
            var gain = c.createGain();
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

          case 'typewriter': {
            var t2 = Date.now();
            if (t2 - STATE.lastTypeTime < TYPE_COOLDOWN) return;
            STATE.lastTypeTime = t2;
            // Short mechanical click like a typewriter key
            var bufLen = Math.floor(c.sampleRate * 0.03);
            var buf = c.createBuffer(1, bufLen, c.sampleRate);
            var data = buf.getChannelData(0);
            for (var i = 0; i < bufLen; i++) {
              data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufLen, 8);
            }
            var noise = c.createBufferSource();
            noise.buffer = buf;
            var hpf = c.createBiquadFilter();
            hpf.type = 'highpass';
            hpf.frequency.value = 2000;
            var g = c.createGain();
            g.gain.setValueAtTime(0.04, now);
            g.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
            noise.connect(hpf);
            hpf.connect(g);
            g.connect(c.destination);
            noise.start(now);
            noise.stop(now + 0.03);
            break;
          }

          case 'whoosh': {
            var bufLen2 = Math.floor(c.sampleRate * 0.35);
            var buf2 = c.createBuffer(1, bufLen2, c.sampleRate);
            var data2 = buf2.getChannelData(0);
            for (var i2 = 0; i2 < bufLen2; i2++) data2[i2] = (Math.random() * 2 - 1) * (1 - i2 / bufLen2);
            var noise2 = c.createBufferSource();
            noise2.buffer = buf2;
            var bpf = c.createBiquadFilter();
            bpf.type = 'bandpass';
            bpf.frequency.setValueAtTime(1000, now);
            bpf.frequency.exponentialRampToValueAtTime(4000, now + 0.15);
            bpf.frequency.exponentialRampToValueAtTime(800, now + 0.35);
            bpf.Q.value = 0.5;
            var g2 = c.createGain();
            g2.gain.setValueAtTime(0.12, now);
            g2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
            noise2.connect(bpf);
            bpf.connect(g2);
            g2.connect(c.destination);
            noise2.start(now);
            noise2.stop(now + 0.35);
            break;
          }

          case 'back': {
            var osc2 = c.createOscillator();
            var gain2 = c.createGain();
            osc2.connect(gain2);
            gain2.connect(c.destination);
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(400, now);
            osc2.frequency.exponentialRampToValueAtTime(800, now + 0.15);
            gain2.gain.setValueAtTime(0.06, now);
            gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
            osc2.start(now);
            osc2.stop(now + 0.2);
            break;
          }

          case 'menu-open': {
            var osc3 = c.createOscillator();
            var gain3 = c.createGain();
            osc3.connect(gain3);
            gain3.connect(c.destination);
            osc3.type = 'sine';
            osc3.frequency.setValueAtTime(600, now);
            osc3.frequency.exponentialRampToValueAtTime(900, now + 0.12);
            gain3.gain.setValueAtTime(0.03, now);
            gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
            osc3.start(now);
            osc3.stop(now + 0.15);
            break;
          }

          case 'menu-close': {
            var osc4 = c.createOscillator();
            var gain4 = c.createGain();
            osc4.connect(gain4);
            gain4.connect(c.destination);
            osc4.type = 'sine';
            osc4.frequency.setValueAtTime(900, now);
            osc4.frequency.exponentialRampToValueAtTime(500, now + 0.1);
            gain4.gain.setValueAtTime(0.03, now);
            gain4.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
            osc4.start(now);
            osc4.stop(now + 0.12);
            break;
          }
        }
      } catch (e) { /* silent fail */ }
    }

    return { play: play };
  })();

  window.EvSound = Sound;

  /* ==========================================================
     2. HOVER & TYPEWRITER SOUNDS
     ========================================================== */
  function initHoverSounds() {
    document.addEventListener('mouseover', function (e) {
      // Only play hover sound on slide menu links
      var menuLink = e.target.closest('.slide-menu-link');
      if (menuLink) {
        Sound.play('hover');
      }
    });
  }

  /* ==========================================================
     3. STARFIELD BACKGROUND (Canvas) — shooting stars + twinkle
     ========================================================== */
  function initParticles() {
    var canvas = document.getElementById('ev-particles');
    if (!canvas || STATE.particlesInited) return;
    STATE.particlesInited = true;

    var ctx2d = canvas.getContext('2d');
    var W, H;
    var stars = [];
    var shootingStars = [];
    var mouse = { x: -9999, y: -9999 };
    var isMobile = window.innerWidth < 768;
    var STAR_COUNT = isMobile ? 120 : Math.min(300, Math.floor(window.innerWidth / 6));
    var CONNECT_DIST = 100;
    var MOUSE_RADIUS = 160;

    function resize() {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    if (!isMobile) {
      document.addEventListener('mousemove', function (e) {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
      });
      document.addEventListener('mouseleave', function () {
        mouse.x = -9999;
        mouse.y = -9999;
      });
    }

    // Create stars with depth layers
    for (var i = 0; i < STAR_COUNT; i++) {
      var depth = Math.random(); // 0 = far, 1 = near
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.15 * (0.3 + depth * 0.7),
        vy: (Math.random() - 0.5) * 0.15 * (0.3 + depth * 0.7),
        r: (0.3 + depth * 1.8),
        baseAlpha: 0.15 + depth * 0.55,
        alpha: 0.3,
        twinkleSpeed: 0.005 + Math.random() * 0.02,
        twinkleOffset: Math.random() * Math.PI * 2,
        depth: depth,
        hue: Math.random() < 0.15 ? (180 + Math.random() * 40) : -1, // 15% chance of cyan/teal tinted star
      });
    }

    // Spawn shooting star
    function spawnShootingStar() {
      if (shootingStars.length >= 2) return;
      var startX = Math.random() * W * 0.8;
      var startY = Math.random() * H * 0.4;
      var angle = Math.PI / 6 + Math.random() * Math.PI / 6; // 30-60 degrees
      var speed = 6 + Math.random() * 8;
      shootingStars.push({
        x: startX,
        y: startY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        decay: 0.012 + Math.random() * 0.008,
        length: 60 + Math.random() * 80,
        width: 1 + Math.random() * 1.5,
      });
    }

    // Randomly spawn shooting stars
    setInterval(function () {
      if (Math.random() < 0.4) spawnShootingStar();
    }, 3000);
    // One on load after a short delay
    setTimeout(spawnShootingStar, 1500);

    var frame = 0;
    function draw() {
      ctx2d.clearRect(0, 0, W, H);
      frame++;
      var accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#4db8ff';
      var rgb = hexToRgb(accent);

      // Draw stars
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];

        // Twinkle
        var twinkle = Math.sin(frame * s.twinkleSpeed + s.twinkleOffset);
        s.alpha = s.baseAlpha + twinkle * 0.25;
        if (s.alpha < 0.05) s.alpha = 0.05;
        if (s.alpha > 0.9) s.alpha = 0.9;

        // Mouse interaction (desktop only)
        if (!isMobile) {
          var dx = s.x - mouse.x;
          var dy = s.y - mouse.y;
          var dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < MOUSE_RADIUS && dist > 0) {
            var force = (MOUSE_RADIUS - dist) / MOUSE_RADIUS;
            s.vx += (dx / dist) * force * 0.15;
            s.vy += (dy / dist) * force * 0.15;
            // Brighten stars near cursor
            s.alpha = Math.min(1, s.alpha + force * 0.4);
          }
        }

        s.vx *= 0.99;
        s.vy *= 0.99;
        s.x += s.vx;
        s.y += s.vy;
        if (s.x < 0) s.x = W;
        if (s.x > W) s.x = 0;
        if (s.y < 0) s.y = H;
        if (s.y > H) s.y = 0;

        // Draw star with optional color
        ctx2d.beginPath();
        ctx2d.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        if (s.hue > 0) {
          ctx2d.fillStyle = 'hsla(' + s.hue + ', 70%, 70%, ' + s.alpha + ')';
        } else {
          ctx2d.fillStyle = 'rgba(' + rgb + ', ' + s.alpha + ')';
        }
        ctx2d.fill();

        // Draw glow for bright/near stars
        if (s.depth > 0.7 && s.alpha > 0.5) {
          ctx2d.beginPath();
          ctx2d.arc(s.x, s.y, s.r * 3, 0, Math.PI * 2);
          ctx2d.fillStyle = 'rgba(' + rgb + ', ' + (s.alpha * 0.08) + ')';
          ctx2d.fill();
        }

        // Connect nearby stars (reduced for performance)
        if (!isMobile && s.depth > 0.5) {
          for (var j = i + 1; j < stars.length; j++) {
            var s2 = stars[j];
            if (s2.depth < 0.5) continue;
            var ddx = s.x - s2.x;
            var ddy = s.y - s2.y;
            var d = Math.sqrt(ddx * ddx + ddy * ddy);
            if (d < CONNECT_DIST) {
              ctx2d.beginPath();
              ctx2d.moveTo(s.x, s.y);
              ctx2d.lineTo(s2.x, s2.y);
              ctx2d.strokeStyle = 'rgba(' + rgb + ', ' + (0.06 * (1 - d / CONNECT_DIST)) + ')';
              ctx2d.lineWidth = 0.4;
              ctx2d.stroke();
            }
          }
        }
      }

      // Draw shooting stars
      for (var k = shootingStars.length - 1; k >= 0; k--) {
        var ss = shootingStars[k];
        ss.x += ss.vx;
        ss.y += ss.vy;
        ss.life -= ss.decay;

        if (ss.life <= 0 || ss.x > W + 100 || ss.y > H + 100) {
          shootingStars.splice(k, 1);
          continue;
        }

        // Shooting star trail
        var tailX = ss.x - (ss.vx / Math.sqrt(ss.vx * ss.vx + ss.vy * ss.vy)) * ss.length * ss.life;
        var tailY = ss.y - (ss.vy / Math.sqrt(ss.vx * ss.vx + ss.vy * ss.vy)) * ss.length * ss.life;

        var grad = ctx2d.createLinearGradient(ss.x, ss.y, tailX, tailY);
        grad.addColorStop(0, 'rgba(255, 255, 255, ' + (ss.life * 0.9) + ')');
        grad.addColorStop(0.3, 'rgba(' + rgb + ', ' + (ss.life * 0.6) + ')');
        grad.addColorStop(1, 'rgba(' + rgb + ', 0)');

        ctx2d.beginPath();
        ctx2d.moveTo(ss.x, ss.y);
        ctx2d.lineTo(tailX, tailY);
        ctx2d.strokeStyle = grad;
        ctx2d.lineWidth = ss.width * ss.life;
        ctx2d.lineCap = 'round';
        ctx2d.stroke();

        // Bright head
        ctx2d.beginPath();
        ctx2d.arc(ss.x, ss.y, 1.5 * ss.life, 0, Math.PI * 2);
        ctx2d.fillStyle = 'rgba(255, 255, 255, ' + (ss.life * 0.8) + ')';
        ctx2d.fill();
      }

      requestAnimationFrame(draw);
    }
    draw();
  }

  function hexToRgb(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    var n = parseInt(hex, 16);
    return ((n >> 16) & 255) + ', ' + ((n >> 8) & 255) + ', ' + (n & 255);
  }

  /* ==========================================================
     4. BACKGROUND PARALLAX (follows cursor)
     ========================================================== */
  function initParallaxBg() {
    // Move body::before/::after gradient orbs with cursor
    document.addEventListener('mousemove', function (e) {
      var x = (e.clientX / window.innerWidth - 0.5) * 2;
      var y = (e.clientY / window.innerHeight - 0.5) * 2;

      // Move canvas + gradient orbs subtly
      var canvas = document.getElementById('ev-particles');
      if (canvas && typeof gsap !== 'undefined') {
        gsap.to(canvas, {
          x: x * -15,
          y: y * -10,
          duration: 1.2,
          ease: 'power2.out',
        });
      }

      // Shift the body pseudo-element gradient orbs via CSS vars
      document.body.style.setProperty('--parallax-x', (x * 30) + 'px');
      document.body.style.setProperty('--parallax-y', (y * 20) + 'px');
    });
  }

  /* ==========================================================
     5. PAGE TRANSITIONS (zoom in/out + seamless slide)
     ========================================================== */
  function initTransitions() {
    if (typeof gsap === 'undefined') return;

    var wrapper = document.querySelector('.page-transition-wrapper') || document.querySelector('.home-wrapper');
    if (!wrapper) return;

    // --- Enter animation ---
    var transData = sessionStorage.getItem('ev_transition');
    if (transData) {
      sessionStorage.removeItem('ev_transition');
      var data = JSON.parse(transData);

      if (data.type === 'slide') {
        // Slide in from left immediately — no delay
        gsap.set(wrapper, { x: '-100%', opacity: 1, visibility: 'visible' });
        gsap.to(wrapper, {
          x: '0%',
          duration: 0.5,
          ease: 'power3.out',
        });
      } else if (data.type === 'zoom-in') {
        gsap.set(wrapper, { opacity: 0 });
        gsap.set(wrapper, { scale: 0.92, transformOrigin: 'center center' });
        gsap.to(wrapper, {
          scale: 1,
          opacity: 1,
          duration: 0.6,
          ease: 'power2.out',
          delay: 0.05,
        });
      } else if (data.type === 'zoom-out') {
        gsap.set(wrapper, { opacity: 0 });
        gsap.set(wrapper, { scale: 1.08 });
        gsap.to(wrapper, {
          scale: 1,
          opacity: 1,
          duration: 0.5,
          ease: 'power2.out',
          delay: 0.05,
        });
      }
    } else if (wrapper.classList.contains('page-transition-wrapper')) {
      gsap.set(wrapper, { opacity: 0 });
      gsap.to(wrapper, {
        opacity: 1,
        y: 0,
        duration: 0.5,
        ease: 'power2.out',
        delay: 0.05,
      });
    }

    // --- Intercept navigation links ---
    document.addEventListener('click', function (e) {
      var link = e.target.closest('a[href]');
      if (!link) return;

      var href = link.getAttribute('href');
      if (!href || href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto') || href.startsWith('javascript')) return;
      if (link.target === '_blank') return;
      if (STATE.isTransitioning) { e.preventDefault(); return; }

      e.preventDefault();
      STATE.isTransitioning = true;

      var isBack = link.classList.contains('back-btn') || link.dataset.transition === 'back';
      var isHome = href === '/' || href === '/index.html';

      if (isHome) {
        // Slide out right, then navigate (incoming page slides in from left)
        sessionStorage.setItem('ev_transition', JSON.stringify({ type: 'slide' }));
        gsap.to(wrapper, {
          x: '100%',
          duration: 0.4,
          ease: 'power3.in',
          onComplete: function () { window.location.href = href; },
        });
      } else {
        // Original zoom transitions for everything else
        var transType = isBack ? 'zoom-out' : 'zoom-in';
        sessionStorage.setItem('ev_transition', JSON.stringify({ type: transType }));

        var tl = gsap.timeline({
          onComplete: function () { window.location.href = href; },
        });

        if (isBack) {
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
      }
    });
  }

  /* ==========================================================
     7. SLIDE-OUT MENU
     ========================================================== */
  function initSlideMenu() {
    var trigger = document.querySelector('.menu-trigger');
    var menu = document.querySelector('.slide-menu');
    var overlay = document.querySelector('.slide-menu-overlay');
    if (!trigger || !menu) return;

    function toggleMenu() {
      STATE.menuOpen = !STATE.menuOpen;
      trigger.classList.toggle('active', STATE.menuOpen);
      menu.classList.toggle('open', STATE.menuOpen);
      if (overlay) overlay.classList.toggle('open', STATE.menuOpen);

      // No sound on menu toggle

      // Stagger animate menu items in
      if (STATE.menuOpen && typeof gsap !== 'undefined') {
        var items = menu.querySelectorAll('.slide-menu-item');
        gsap.from(items, {
          x: 60,
          opacity: 0,
          stagger: 0.06,
          duration: 0.5,
          ease: 'power2.out',
          delay: 0.15,
        });
      }
    }

    trigger.addEventListener('click', toggleMenu);
    if (overlay) {
      overlay.addEventListener('click', function () {
        if (STATE.menuOpen) toggleMenu();
      });
    }

    // Close on escape
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && STATE.menuOpen) toggleMenu();
    });

    window.toggleSlideMenu = toggleMenu;
  }

  /* ==========================================================
     8. HOMEPAGE FULL-SCREEN SECTIONS
     ========================================================== */
  function initHomeSections() {
    var sections = document.querySelectorAll('.section-card');
    if (!sections.length || typeof gsap === 'undefined') return;

    // Parallax on mouse move for section content
    document.addEventListener('mousemove', function (e) {
      var x = (e.clientX / window.innerWidth - 0.5) * 2;
      var y = (e.clientY / window.innerHeight - 0.5) * 2;

      sections.forEach(function (sec) {
        var inner = sec.querySelector('.section-inner');
        if (inner) {
          gsap.to(inner, {
            x: x * 12,
            y: y * 8,
            duration: 0.8,
            ease: 'power2.out',
          });
        }
        var bg = sec.querySelector('.section-bg-text');
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
    sections.forEach(function (sec) {
      var href = sec.dataset.href;
      if (!href) return;

      sec.addEventListener('click', function (e) {
        if (STATE.isTransitioning) return;
        e.preventDefault();
        STATE.isTransitioning = true;

        sessionStorage.setItem('ev_transition', JSON.stringify({ type: 'zoom-in' }));

        var wrapper = document.querySelector('.home-wrapper') || document.body;
        var rect = sec.getBoundingClientRect();
        var ox = rect.left + rect.width / 2;
        var oy = rect.top + rect.height / 2;

        gsap.to(wrapper, {
          scale: 1.5,
          opacity: 0,
          duration: 0.6,
          ease: 'power3.in',
          transformOrigin: ox + 'px ' + oy + 'px',
          onComplete: function () { window.location.href = href; },
        });
      });
    });
  }

  /* ==========================================================
     9. SCROLL ANIMATIONS (GSAP ScrollTrigger)
     ========================================================== */
  function initScrollAnimations() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
    gsap.registerPlugin(ScrollTrigger);

    gsap.utils.toArray('.gsap-reveal').forEach(function (el) {
      gsap.from(el, {
        scrollTrigger: { trigger: el, start: 'top 85%', once: true },
        opacity: 0,
        y: 40,
        duration: 0.8,
        ease: 'power2.out',
      });
    });

    gsap.utils.toArray('.gsap-stagger-parent').forEach(function (parent) {
      var children = parent.querySelectorAll('.gsap-stagger');
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
     10. MAGNETIC BUTTONS
     ========================================================== */
  function initMagnetic() {
    if (window.innerWidth < 768) return;

    document.querySelectorAll('.magnetic').forEach(function (btn) {
      btn.addEventListener('mousemove', function (e) {
        var rect = btn.getBoundingClientRect();
        var x = e.clientX - rect.left - rect.width / 2;
        var y = e.clientY - rect.top - rect.height / 2;
        gsap.to(btn, { x: x * 0.25, y: y * 0.25, duration: 0.3, ease: 'power2.out' });
      });

      btn.addEventListener('mouseleave', function () {
        gsap.to(btn, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1, 0.4)' });
      });
    });
  }

  /* ==========================================================
     11. THEME (always dark)
     ========================================================== */
  function initTheme() {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('ep_theme', 'dark');
  }

  window.toggleSound = function () {
    STATE.soundEnabled = !STATE.soundEnabled;
    localStorage.setItem('ep_sound', STATE.soundEnabled ? 'on' : 'off');
    // No sound on toggle
    var btns = document.querySelectorAll('.sound-toggle');
    btns.forEach(function (btn) {
      btn.textContent = STATE.soundEnabled ? 'Sound On' : 'Sound Off';
    });
  };

  /* ==========================================================
     12. BACKGROUND MUSIC (persists across pages)
     ========================================================== */
  function initBgMusic() {
    // Don't play on rhythm game page — it has its own music
    if (window.location.pathname.indexOf('rhythm') !== -1) return;

    var audio = document.createElement('audio');
    var TARGET_VOL = 0.15;
    audio.id = 'ev-bg-music';
    audio.loop = true;
    audio.volume = 0;
    audio.preload = 'auto';
    audio.src = '/background.mp3';
    document.body.appendChild(audio);

    // Restore position from previous page
    var savedTime = parseFloat(sessionStorage.getItem('ev_bgm_time') || '0');
    if (savedTime > 0) audio.currentTime = savedTime;

    // Fade in smoothly to avoid jitter on page switch
    function fadeIn() {
      var vol = 0;
      var step = TARGET_VOL / 20; // 20 steps over ~400ms
      var iv = setInterval(function () {
        vol += step;
        if (vol >= TARGET_VOL) { audio.volume = TARGET_VOL; clearInterval(iv); }
        else { audio.volume = vol; }
      }, 20);
    }

    // Save position periodically and before leaving
    setInterval(function () {
      if (!audio.paused) sessionStorage.setItem('ev_bgm_time', audio.currentTime);
    }, 1000);
    window.addEventListener('beforeunload', function () {
      if (!audio.paused) sessionStorage.setItem('ev_bgm_time', audio.currentTime);
    });

    // Autoplay after first user interaction
    function tryPlay() {
      if (!STATE.soundEnabled) return;
      audio.play().then(function () { fadeIn(); }).catch(function () {});
    }

    // Try immediately, then on first click/key
    tryPlay();
    document.addEventListener('click', function onFirstClick() {
      tryPlay();
      document.removeEventListener('click', onFirstClick);
    });
    document.addEventListener('keydown', function onFirstKey() {
      tryPlay();
      document.removeEventListener('keydown', onFirstKey);
    });

    // Respect sound toggle
    var origToggle = window.toggleSound;
    window.toggleSound = function () {
      origToggle();
      if (STATE.soundEnabled) {
        tryPlay();
      } else {
        audio.pause();
      }
    };

    window.evBgMusic = audio;
  }

  /* ==========================================================
     14. AURORA / COMET GRADIENT ACCENTS
     ========================================================== */
  function initAuroraAccents() {
    // Create aurora overlay element
    var aurora = document.createElement('div');
    aurora.id = 'ev-aurora';
    aurora.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:0;pointer-events:none;opacity:0.4;';
    aurora.innerHTML = '<div class="aurora-band aurora-band-1"></div><div class="aurora-band aurora-band-2"></div><div class="aurora-band aurora-band-3"></div>';
    // Insert after canvas
    var particleCanvas = document.getElementById('ev-particles');
    if (particleCanvas && particleCanvas.parentNode) {
      particleCanvas.parentNode.insertBefore(aurora, particleCanvas.nextSibling);
    } else {
      document.body.insertBefore(aurora, document.body.firstChild);
    }
  }

  /* ==========================================================
     INIT
     ========================================================== */
  function init() {
    initTheme();
    initHoverSounds();
    initParticles();
    initParallaxBg();
    initSlideMenu();
    initTransitions();
    initHomeSections();
    initMagnetic();
    initAuroraAccents();
    initBgMusic();

    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
      initScrollAnimations();
    } else {
      window.addEventListener('load', initScrollAnimations);
    }

    var soundBtns = document.querySelectorAll('.sound-toggle');
    soundBtns.forEach(function (btn) {
      btn.textContent = STATE.soundEnabled ? 'Sound On' : 'Sound Off';
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
