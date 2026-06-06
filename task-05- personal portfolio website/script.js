/* ═══════════════════════════════════════════════════════════════
   RAHUL KUMAR — PORTFOLIO JAVASCRIPT
   Features: Loader, Particles, Typing, Scroll Reveal, Counters,
             Skill Bars, Filters, Navbar, Contact Form, Back-to-Top
   ═══════════════════════════════════════════════════════════════ */

'use strict';

/* ─────────────────────────────────────────────────────────────
   1. LOADING SCREEN
   ───────────────────────────────────────────────────────────── */
(function initLoader() {
  const loader = document.getElementById('loader');
  document.body.classList.add('loading');

  window.addEventListener('load', () => {
    setTimeout(() => {
      loader.classList.add('hidden');
      document.body.classList.remove('loading');
    }, 2200);
  });
})();


/* ─────────────────────────────────────────────────────────────
   2. SCROLL PROGRESS BAR
   ───────────────────────────────────────────────────────────── */
(function initScrollProgress() {
  const bar = document.getElementById('scroll-progress');

  window.addEventListener('scroll', () => {
    const scrollTop    = document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    bar.style.width    = ((scrollTop / scrollHeight) * 100) + '%';
  }, { passive: true });
})();


/* ─────────────────────────────────────────────────────────────
   3. NAVBAR — scroll behaviour + active link + hamburger
   ───────────────────────────────────────────────────────────── */
(function initNavbar() {
  const navbar    = document.getElementById('navbar');
  const hamburger = document.getElementById('hamburger');
  const navLinks  = document.getElementById('nav-links');
  const allLinks  = document.querySelectorAll('.nav-link');
  const sections  = document.querySelectorAll('section[id]');

  /* Scroll → add "scrolled" class */
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 30);
    updateActiveLink();
  }, { passive: true });

  /* Hamburger toggle */
  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('open');
    navLinks.classList.toggle('open');
  });

  /* Close menu on link click */
  allLinks.forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('open');
      navLinks.classList.remove('open');
    });
  });

  /* Active section highlight */
  function updateActiveLink() {
    let currentId = '';
    sections.forEach(sec => {
      const top = sec.offsetTop - 100;
      if (window.scrollY >= top) currentId = sec.getAttribute('id');
    });
    allLinks.forEach(link => {
      link.classList.toggle('active', link.getAttribute('href') === '#' + currentId);
    });
  }
  updateActiveLink();
})();


/* ─────────────────────────────────────────────────────────────
   4. PARTICLE BACKGROUND (Canvas)
   ───────────────────────────────────────────────────────────── */
(function initParticles() {
  const canvas = document.getElementById('particles-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let W, H, particles = [], animId;

  const CONFIG = {
    count:       80,
    speed:       0.35,
    maxRadius:   2.2,
    lineDistance: 120,
    colors:      ['rgba(0,245,200,', 'rgba(0,112,243,', 'rgba(124,58,237,'],
  };

  class Particle {
    constructor() { this.reset(true); }
    reset(init = false) {
      this.x  = Math.random() * W;
      this.y  = init ? Math.random() * H : H + 10;
      this.r  = Math.random() * CONFIG.maxRadius + 0.4;
      this.vx = (Math.random() - 0.5) * CONFIG.speed;
      this.vy = -(Math.random() * CONFIG.speed + 0.1);
      this.color = CONFIG.colors[Math.floor(Math.random() * CONFIG.colors.length)];
      this.alpha = Math.random() * 0.5 + 0.2;
    }
    update() {
      this.x += this.vx;
      this.y += this.vy;
      if (this.y < -10 || this.x < -10 || this.x > W + 10) this.reset();
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fillStyle = this.color + this.alpha + ')';
      ctx.fill();
    }
  }

  function resize() {
    W = canvas.width  = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
  }

  function buildParticles() {
    particles = Array.from({ length: CONFIG.count }, () => new Particle());
  }

  function drawLines() {
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx   = particles[i].x - particles[j].x;
        const dy   = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < CONFIG.lineDistance) {
          const alpha = (1 - dist / CONFIG.lineDistance) * 0.12;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(0,245,200,${alpha})`;
          ctx.lineWidth   = 0.5;
          ctx.stroke();
        }
      }
    }
  }

  function animate() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => { p.update(); p.draw(); });
    drawLines();
    animId = requestAnimationFrame(animate);
  }

  resize();
  buildParticles();
  animate();

  const ro = new ResizeObserver(() => { resize(); });
  ro.observe(canvas.parentElement);
})();


/* ─────────────────────────────────────────────────────────────
   5. TYPING ANIMATION
   ───────────────────────────────────────────────────────────── */
(function initTyping() {
  const el = document.getElementById('typed-text');
  if (!el) return;

  const phrases = [
    'Full Stack Web Developer',
    'MERN Stack Engineer',
    'AI-Powered App Builder',
    'Problem Solver',
    'CS Student & Intern Seeker',
  ];

  let phraseIdx  = 0;
  let charIdx    = 0;
  let deleting   = false;
  let pauseTimer = null;

  const TYPING_SPEED  = 80;
  const DELETE_SPEED  = 40;
  const PAUSE_AFTER   = 1800;
  const PAUSE_BEFORE  = 350;

  function tick() {
    const phrase  = phrases[phraseIdx];
    const current = deleting
      ? phrase.substring(0, charIdx - 1)
      : phrase.substring(0, charIdx + 1);

    el.textContent = current;
    charIdx = deleting ? charIdx - 1 : charIdx + 1;

    if (!deleting && charIdx > phrase.length) {
      deleting = true;
      pauseTimer = setTimeout(tick, PAUSE_AFTER);
      return;
    }
    if (deleting && charIdx === 0) {
      deleting   = false;
      phraseIdx  = (phraseIdx + 1) % phrases.length;
      pauseTimer = setTimeout(tick, PAUSE_BEFORE);
      return;
    }
    pauseTimer = setTimeout(tick, deleting ? DELETE_SPEED : TYPING_SPEED);
  }

  setTimeout(tick, 800);
})();


/* ─────────────────────────────────────────────────────────────
   6. SCROLL REVEAL (IntersectionObserver)
   ───────────────────────────────────────────────────────────── */
(function initReveal() {
  const revealEls = document.querySelectorAll('.reveal');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        // stagger siblings slightly
        const siblings = [...entry.target.parentElement.querySelectorAll('.reveal:not(.visible)')];
        const delay    = siblings.indexOf(entry.target) * 80;
        setTimeout(() => entry.target.classList.add('visible'), delay);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  revealEls.forEach(el => observer.observe(el));
})();


/* ─────────────────────────────────────────────────────────────
   7. ANIMATED COUNTERS (About stats)
   ───────────────────────────────────────────────────────────── */
(function initCounters() {
  const counters = document.querySelectorAll('.stat-number[data-target]');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el     = entry.target;
      const target = parseInt(el.dataset.target, 10);
      const suffix = target >= 500 ? '+' : '';
      let   start  = 0;
      const duration = 1600;
      const step     = 16;
      const increment = target / (duration / step);

      const timer = setInterval(() => {
        start = Math.min(start + increment, target);
        el.textContent = Math.floor(start) + suffix;
        if (start >= target) clearInterval(timer);
      }, step);

      observer.unobserve(el);
    });
  }, { threshold: 0.5 });

  counters.forEach(el => observer.observe(el));
})();


/* ─────────────────────────────────────────────────────────────
   8. SKILL PROGRESS BARS
   ───────────────────────────────────────────────────────────── */
(function initSkillBars() {
  const bars = document.querySelectorAll('.skill-bar[data-width]');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const bar   = entry.target;
      const width = bar.dataset.width;
      setTimeout(() => { bar.style.width = width + '%'; }, 200);
      observer.unobserve(bar);
    });
  }, { threshold: 0.3 });

  bars.forEach(bar => observer.observe(bar));
})();


/* ─────────────────────────────────────────────────────────────
   9. SKILL CATEGORY FILTER
   ───────────────────────────────────────────────────────────── */
(function initSkillFilter() {
  const btns  = document.querySelectorAll('.skill-filters .filter-btn');
  const cards = document.querySelectorAll('.skill-card[data-category]');

  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.dataset.filter;

      cards.forEach(card => {
        const match = filter === 'all' || card.dataset.category === filter;
        if (match) {
          card.classList.remove('hidden');
          // re-trigger bar animation
          const bar = card.querySelector('.skill-bar');
          if (bar) {
            bar.style.width = '0';
            setTimeout(() => { bar.style.width = bar.dataset.width + '%'; }, 100);
          }
        } else {
          card.classList.add('hidden');
        }
      });
    });
  });
})();


/* ─────────────────────────────────────────────────────────────
   10. PROJECT CATEGORY FILTER
   ───────────────────────────────────────────────────────────── */
(function initProjectFilter() {
  const btns    = document.querySelectorAll('.project-filters .filter-btn');
  const cards   = document.querySelectorAll('.project-card[data-ptag]');

  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.dataset.pfilter;

      cards.forEach(card => {
        const tags  = (card.dataset.ptag || '').split(' ');
        const match = filter === 'all' || tags.includes(filter);
        card.classList.toggle('hidden', !match);
        if (match) {
          // make sure reveal triggers again
          card.classList.remove('visible');
          requestAnimationFrame(() => card.classList.add('visible'));
        }
      });
    });
  });
})();


/* ─────────────────────────────────────────────────────────────
   11. CONTACT FORM (client-side demo)
   ───────────────────────────────────────────────────────────── */
(function initContactForm() {
  const form    = document.getElementById('contact-form');
  const success = document.getElementById('form-success');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const btn = form.querySelector('.submit-btn');
    const originalContent = btn.innerHTML;

    // Loading state
    btn.innerHTML = '<span>Sending…</span>';
    btn.disabled  = true;

    // Simulate network delay (replace with real fetch/EmailJS/etc.)
    setTimeout(() => {
      btn.innerHTML = originalContent;
      btn.disabled  = false;
      form.reset();
      success.classList.add('visible');
      setTimeout(() => success.classList.remove('visible'), 5000);
    }, 1500);
  });
})();


/* ─────────────────────────────────────────────────────────────
   12. BACK TO TOP BUTTON
   ───────────────────────────────────────────────────────────── */
(function initBackToTop() {
  const btn = document.getElementById('back-to-top');
  if (!btn) return;

  window.addEventListener('scroll', () => {
    btn.classList.toggle('visible', window.scrollY > 400);
  }, { passive: true });

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();


/* ─────────────────────────────────────────────────────────────
   13. SMOOTH ANCHOR SCROLLING (fallback for older browsers)
   ───────────────────────────────────────────────────────────── */
(function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (href === '#') return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
})();


/* ─────────────────────────────────────────────────────────────
   14. CURSOR GLOW EFFECT (desktop only)
   ───────────────────────────────────────────────────────────── */
(function initCursorGlow() {
  if (window.matchMedia('(pointer: coarse)').matches) return; // skip touch

  const glow = document.createElement('div');
  glow.style.cssText = `
    position: fixed; pointer-events: none; z-index: 9999;
    width: 300px; height: 300px; border-radius: 50%;
    background: radial-gradient(circle, rgba(0,245,200,0.05) 0%, transparent 70%);
    transform: translate(-50%, -50%);
    transition: opacity 0.3s ease;
    will-change: transform;
  `;
  document.body.appendChild(glow);

  let mx = 0, my = 0, cx = 0, cy = 0;
  let rafId;

  document.addEventListener('mousemove', (e) => { mx = e.clientX; my = e.clientY; });
  document.addEventListener('mouseleave', () => { glow.style.opacity = '0'; });
  document.addEventListener('mouseenter', () => { glow.style.opacity = '1'; });

  function lerp(a, b, t) { return a + (b - a) * t; }

  function loop() {
    cx = lerp(cx, mx, 0.1);
    cy = lerp(cy, my, 0.1);
    glow.style.left = cx + 'px';
    glow.style.top  = cy + 'px';
    rafId = requestAnimationFrame(loop);
  }
  loop();
})();


/* ─────────────────────────────────────────────────────────────
   15. RESUME MODAL — open / close / keyboard / scroll-lock
   ───────────────────────────────────────────────────────────── */
(function initResumeModal() {
  const modal    = document.getElementById('resume-modal');
  const closeBtn = document.getElementById('resume-close');
  const backdrop = document.getElementById('resume-backdrop');
  if (!modal) return;

  // All buttons that trigger the modal
  const triggers = document.querySelectorAll('#resume-btn, #hero-resume-btn');

  function openModal() {
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
    closeBtn.focus();
  }
  function closeModal() {
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }

  triggers.forEach(btn => btn.addEventListener('click', openModal));
  closeBtn.addEventListener('click', closeModal);
  backdrop.addEventListener('click', closeModal);

  // Escape key closes modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('open')) closeModal();
  });
})();


/* ─────────────────────────────────────────────────────────────
   16. HERO SCROLL INDICATOR — hide after first scroll
   ───────────────────────────────────────────────────────────── */
(function initScrollIndicator() {
  const indicator = document.querySelector('.scroll-indicator');
  if (!indicator) return;
  window.addEventListener('scroll', () => {
    indicator.style.opacity = window.scrollY > 80 ? '0' : '1';
  }, { passive: true });
})();


/* ─────────────────────────────────────────────────────────────
   17. PROJECT CARDS — tilt effect on hover (desktop)
   ───────────────────────────────────────────────────────────── */
(function initCardTilt() {
  if (window.matchMedia('(pointer: coarse)').matches) return;

  document.querySelectorAll('.project-card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect  = card.getBoundingClientRect();
      const x     = e.clientX - rect.left;
      const y     = e.clientY - rect.top;
      const cx    = rect.width  / 2;
      const cy    = rect.height / 2;
      const rotX  = ((y - cy) / cy) * -5;
      const rotY  = ((x - cx) / cx) *  5;
      card.style.transform = `translateY(-6px) rotateX(${rotX}deg) rotateY(${rotY}deg)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
})();


/* ─────────────────────────────────────────────────────────────
   18. FLOATING BADGE PARALLAX (hero visual)
   ───────────────────────────────────────────────────────────── */
(function initBadgeParallax() {
  if (window.matchMedia('(pointer: coarse)').matches) return;
  const badges = document.querySelectorAll('.float-badge');
  if (!badges.length) return;

  document.addEventListener('mousemove', (e) => {
    const cx = window.innerWidth  / 2;
    const cy = window.innerHeight / 2;
    const dx = (e.clientX - cx) / cx;
    const dy = (e.clientY - cy) / cy;

    badges.forEach((badge, i) => {
      const factor = (i + 1) * 4;
      badge.style.transform = `translateX(${dx * factor}px) translateY(${dy * factor}px)`;
    });
  });
})();


/* ─────────────────────────────────────────────────────────────
   19. ACTIVE NAV HIGHLIGHT on page load (in case scrolled)
   ───────────────────────────────────────────────────────────── */
window.dispatchEvent(new Event('scroll'));


/* ─────────────────────────────────────────────────────────────
   20. PERFORMANCE: PAUSE PARTICLES when tab is hidden
   ───────────────────────────────────────────────────────────── */
document.addEventListener('visibilitychange', () => {
  // Particles self-manage via requestAnimationFrame — browser
  // auto-throttles rAF in hidden tabs, no extra action needed.
});