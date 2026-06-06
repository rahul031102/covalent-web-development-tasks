/**
 * LUMINARY — Premium SaaS Landing Page
 * script.js
 *
 * Features:
 *  - Custom cursor
 *  - Particle canvas background
 *  - Sticky navbar with scroll-based style change
 *  - Mobile hamburger menu
 *  - Active nav link on scroll
 *  - Intersection Observer fade-in for sections
 *  - Animated stat counters
 *  - Smooth scroll
 */

'use strict';

/* ============================================================
   UTILITY
   ============================================================ */
const qs  = (sel, ctx = document) => ctx.querySelector(sel);
const qsa = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

/* ============================================================
   1. CUSTOM CURSOR
   ============================================================ */
(function initCursor() {
  const cursor    = qs('#cursor');
  const cursorDot = qs('#cursorDot');

  if (!cursor || !cursorDot) return;

  // Only on non-touch devices
  if (window.matchMedia('(hover: none)').matches) {
    cursor.style.display    = 'none';
    cursorDot.style.display = 'none';
    return;
  }

  let mx = -100, my = -100; // start offscreen
  let cx = -100, cy = -100; // cursor (ring) position – lerped
  let animId;

  document.addEventListener('mousemove', e => {
    mx = e.clientX;
    my = e.clientY;
    // Dot follows immediately
    cursorDot.style.left = mx + 'px';
    cursorDot.style.top  = my + 'px';
  });

  // Ring follows with lerp for smoothness
  function animateCursor() {
    cx += (mx - cx) * 0.14;
    cy += (my - cy) * 0.14;
    cursor.style.left = cx + 'px';
    cursor.style.top  = cy + 'px';
    animId = requestAnimationFrame(animateCursor);
  }
  animateCursor();

  // Grow cursor on interactive elements
  const interactiveSelectors = 'a, button, [role="button"], input, .trust-logo, .stat-card, .float-card';

  document.addEventListener('mouseover', e => {
    if (e.target.closest(interactiveSelectors)) {
      cursor.style.width        = '48px';
      cursor.style.height       = '48px';
      cursor.style.borderColor  = 'rgba(167,139,250,0.8)';
    }
  });

  document.addEventListener('mouseout', e => {
    if (e.target.closest(interactiveSelectors)) {
      cursor.style.width       = '32px';
      cursor.style.height      = '32px';
      cursor.style.borderColor = 'rgba(167,139,250,0.5)';
    }
  });

  document.addEventListener('mousedown', () => {
    cursor.style.transform = 'translate(-50%,-50%) scale(0.8)';
  });

  document.addEventListener('mouseup', () => {
    cursor.style.transform = 'translate(-50%,-50%) scale(1)';
  });
})();


/* ============================================================
   2. PARTICLE CANVAS
   ============================================================ */
(function initParticles() {
  const canvas = qs('#particleCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let W, H, particles = [], animId;

  const CONFIG = {
    count:       60,
    minR:        0.8,
    maxR:        2.2,
    minSpeed:    0.08,
    maxSpeed:    0.28,
    colors:      ['#a78bfa', '#38bdf8', '#7c3aed', '#34d399'],
    connections: true,
    connDist:    140,
    connOpacity: 0.06,
  };

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function createParticle() {
    return {
      x:     rand(0, W),
      y:     rand(0, H),
      r:     rand(CONFIG.minR, CONFIG.maxR),
      vx:    rand(-CONFIG.maxSpeed, CONFIG.maxSpeed),
      vy:    rand(-CONFIG.maxSpeed, CONFIG.maxSpeed),
      color: CONFIG.colors[Math.floor(Math.random() * CONFIG.colors.length)],
      alpha: rand(0.3, 0.8),
    };
  }

  function initParticles() {
    particles = Array.from({ length: CONFIG.count }, createParticle);
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // Draw connections
    if (CONFIG.connections) {
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx   = particles[i].x - particles[j].x;
          const dy   = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < CONFIG.connDist) {
            const alpha = CONFIG.connOpacity * (1 - dist / CONFIG.connDist);
            ctx.beginPath();
            ctx.strokeStyle = `rgba(167,139,250,${alpha})`;
            ctx.lineWidth   = 0.5;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
    }

    // Draw particles
    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color + Math.round(p.alpha * 255).toString(16).padStart(2, '0');
      ctx.fill();
    });
  }

  function update() {
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;

      // Wrap around edges
      if (p.x < -10) p.x = W + 10;
      if (p.x > W + 10) p.x = -10;
      if (p.y < -10) p.y = H + 10;
      if (p.y > H + 10) p.y = -10;
    });
  }

  function loop() {
    update();
    draw();
    animId = requestAnimationFrame(loop);
  }

  resize();
  initParticles();
  loop();

  window.addEventListener('resize', () => {
    resize();
    initParticles();
  });
})();


/* ============================================================
   3. NAVBAR — Scroll style + hamburger + active link
   ============================================================ */
(function initNavbar() {
  const navbar    = qs('#navbar');
  const hamburger = qs('#hamburger');
  const mobileMenu = qs('#mobileMenu');
  const navLinks   = qsa('.nav-link');
  const mobileLinks = qsa('.mobile-link');
  const sections   = qsa('section[id]');

  if (!navbar) return;

  /* ── Scroll-based style ── */
  let lastScroll = 0;

  function onScroll() {
    const scrollY = window.scrollY;

    // Add/remove scrolled class
    if (scrollY > 20) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }

    // Active section highlighting
    let currentId = '';
    sections.forEach(section => {
      const top    = section.offsetTop - 100;
      const bottom = top + section.offsetHeight;
      if (scrollY >= top && scrollY < bottom) {
        currentId = section.id;
      }
    });

    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === '#' + currentId) {
        link.classList.add('active');
      }
    });

    lastScroll = scrollY;
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll(); // run once on load

  /* ── Hamburger toggle ── */
  function toggleMenu(open) {
    hamburger.classList.toggle('open', open);
    mobileMenu.classList.toggle('open', open);
    hamburger.setAttribute('aria-expanded', String(open));
    mobileMenu.setAttribute('aria-hidden', String(!open));
    document.body.style.overflow = open ? 'hidden' : '';
  }

  hamburger.addEventListener('click', () => {
    const isOpen = hamburger.classList.contains('open');
    toggleMenu(!isOpen);
  });

  // Close on mobile link click
  mobileLinks.forEach(link => {
    link.addEventListener('click', () => toggleMenu(false));
  });

  // Close on outside click
  document.addEventListener('click', e => {
    if (!navbar.contains(e.target)) {
      toggleMenu(false);
    }
  });

  // Close on resize to desktop
  window.addEventListener('resize', () => {
    if (window.innerWidth > 900) {
      toggleMenu(false);
    }
  });

  /* ── Smooth scroll for anchor links ── */
  qsa('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const id = link.getAttribute('href').slice(1);
      if (!id) return;
      const target = qs('#' + id);
      if (!target) return;
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });
})();


/* ============================================================
   4. INTERSECTION OBSERVER — Section reveal animations
   ============================================================ */
(function initReveal() {
  // Elements in trust and stats sections need IO
  const revealEls = qsa('.trust-section .animate-fade-up, .stats-section .animate-fade-up');

  if (!revealEls.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        // Stagger delay based on position in its parent
        const siblings = qsa('.animate-fade-up', entry.target.parentElement);
        const index    = siblings.indexOf(entry.target);
        const delay    = (parseFloat(entry.target.style.getPropertyValue('--delay') || '0')) + index * 0.05;

        setTimeout(() => {
          entry.target.classList.add('in-view');
        }, delay * 1000);

        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -40px 0px',
  });

  revealEls.forEach(el => {
    // Reset for IO-driven animation
    el.style.opacity   = '0';
    el.style.transform = 'translateY(28px)';
    el.style.animation = 'none'; // disable CSS animation for these
    observer.observe(el);
  });
})();


/* ============================================================
   5. STAT COUNTER ANIMATION
   ============================================================ */
(function initCounters() {
  const statNumbers = qsa('.stat-number[data-target]');

  if (!statNumbers.length) return;

  function easeOut(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function animateCounter(el) {
    const raw    = el.dataset.target;
    const target = parseFloat(raw);
    const isFloat = raw.includes('.');
    const suffix  = el.dataset.suffix || '';
    const prefix  = el.dataset.prefix || '';
    const duration = 1800;
    const start    = performance.now();

    function tick(now) {
      const elapsed  = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const value    = easeOut(progress) * target;

      if (isFloat) {
        el.textContent = prefix + value.toFixed(2) + suffix;
      } else if (target >= 1000) {
        el.textContent = prefix + Math.round(value).toLocaleString() + suffix;
      } else {
        el.textContent = prefix + Math.round(value) + suffix;
      }

      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        // Final value
        if (isFloat) {
          el.textContent = prefix + target.toFixed(2) + suffix;
        } else if (target >= 1000) {
          el.textContent = prefix + target.toLocaleString() + suffix;
        } else {
          el.textContent = prefix + target + suffix;
        }
      }
    }

    requestAnimationFrame(tick);
  }

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  statNumbers.forEach(el => observer.observe(el));
})();


/* ============================================================
   6. DASHBOARD BAR WIDTHS — animate progress bars
   ============================================================ */
(function initDashBars() {
  const bars = qsa('.fc-bar-fill');

  // Store original widths
  bars.forEach(bar => {
    const target = bar.style.width;
    bar.style.width = '0';
    bar._target = target;
  });

  // Animate when hero is visible (on load)
  setTimeout(() => {
    bars.forEach(bar => {
      bar.style.width = bar._target;
    });
  }, 800);
})();


/* ============================================================
   7. PARALLAX — subtle depth on hero scroll
   ============================================================ */
(function initParallax() {
  const blobs = qsa('.blob');
  const heroVisual = qs('.hero-visual');

  if (!blobs.length) return;

  function onScroll() {
    const scrollY = window.scrollY;

    // Only parallax when hero is in view
    if (scrollY > window.innerHeight * 1.2) return;

    blobs.forEach((blob, i) => {
      const speed = 0.04 + i * 0.025;
      blob.style.transform = `translateY(${scrollY * speed}px)`;
    });

    if (heroVisual) {
      heroVisual.style.transform = `translateY(${scrollY * 0.03}px)`;
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
})();


/* ============================================================
   8. BUTTON RIPPLE EFFECT
   ============================================================ */
(function initRipple() {
  qsa('.btn-primary, .btn-nav-primary').forEach(btn => {
    btn.addEventListener('click', function(e) {
      const rect   = this.getBoundingClientRect();
      const x      = e.clientX - rect.left;
      const y      = e.clientY - rect.top;
      const ripple = document.createElement('span');

      ripple.style.cssText = `
        position: absolute;
        border-radius: 50%;
        background: rgba(255,255,255,0.25);
        width: 0; height: 0;
        left: ${x}px;
        top: ${y}px;
        transform: translate(-50%, -50%);
        pointer-events: none;
        animation: rippleAnim 0.6s ease-out forwards;
      `;

      // Inject keyframes once
      if (!document.getElementById('rippleStyle')) {
        const style = document.createElement('style');
        style.id = 'rippleStyle';
        style.textContent = `
          @keyframes rippleAnim {
            to { width: 200px; height: 200px; opacity: 0; }
          }
        `;
        document.head.appendChild(style);
      }

      this.style.position = 'relative';
      this.style.overflow = 'hidden';
      this.appendChild(ripple);

      setTimeout(() => ripple.remove(), 700);
    });
  });
})();


/* ============================================================
   9. PILL HOVER — track mouse for subtle glow shift
   ============================================================ */
(function initPillGlow() {
  const pill = qs('.pill');
  if (!pill) return;

  pill.addEventListener('mousemove', e => {
    const rect = pill.getBoundingClientRect();
    const x    = ((e.clientX - rect.left) / rect.width  * 100).toFixed(1);
    const y    = ((e.clientY - rect.top)  / rect.height * 100).toFixed(1);
    pill.style.background = `radial-gradient(circle at ${x}% ${y}%, rgba(167,139,250,0.18) 0%, rgba(167,139,250,0.06) 100%)`;
  });

  pill.addEventListener('mouseleave', () => {
    pill.style.background = '';
  });
})();


/* ============================================================
   10. STAT CARD TILT EFFECT
   ============================================================ */
(function initTilt() {
  const cards = qsa('.stat-card');

  if (window.matchMedia('(hover: none)').matches) return;

  cards.forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect   = card.getBoundingClientRect();
      const x      = e.clientX - rect.left;
      const y      = e.clientY - rect.top;
      const cx     = rect.width  / 2;
      const cy     = rect.height / 2;
      const rotateX = ((y - cy) / cy) * -5;
      const rotateY = ((x - cx) / cx) *  5;

      card.style.transform = `perspective(600px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
})();


/* ============================================================
   11. FLOAT CARDS — mouse proximity repulsion
   ============================================================ */
(function initFloatRepulsion() {
  const floatCards = qsa('.float-card');

  if (!floatCards.length || window.matchMedia('(hover: none)').matches) return;

  document.addEventListener('mousemove', e => {
    floatCards.forEach(card => {
      const rect = card.getBoundingClientRect();
      const cx   = rect.left + rect.width  / 2;
      const cy   = rect.top  + rect.height / 2;
      const dx   = e.clientX - cx;
      const dy   = e.clientY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const MAX  = 120;

      if (dist < MAX) {
        const force = (1 - dist / MAX) * 10;
        const nx    = (dx / dist) * force;
        const ny    = (dy / dist) * force;
        card.style.transition = 'transform 0.1s ease';
        card.style.transform  = `translate(${-nx}px, ${-ny}px)`;
      } else {
        card.style.transition = 'transform 0.5s ease';
        card.style.transform  = '';
      }
    });
  });
})();
