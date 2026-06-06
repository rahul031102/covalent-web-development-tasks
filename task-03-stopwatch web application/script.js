/* ═══════════════════════════════════════════════════════════
   CHRONO — Advanced Stopwatch · script.js
   Features: Timer engine, lap tracking, navbar, scroll FX
   ═══════════════════════════════════════════════════════════ */

'use strict';

/* ═══════════════════════════════════
   1. STOPWATCH ENGINE
   ═══════════════════════════════════ */

// State
let state = 'idle'; // idle | running | paused
let startTime    = 0;   // performance.now() reference
let elapsed      = 0;   // total elapsed ms
let animFrameId  = null;
let laps         = [];   // array of { split, total } in ms
let lapStartTime = 0;   // elapsed ms when last lap was recorded

// DOM refs — timer
const hoursEl    = document.getElementById('hours');
const minutesEl  = document.getElementById('minutes');
const secondsEl  = document.getElementById('seconds');
const msEl       = document.getElementById('milliseconds');
const statusEl   = document.getElementById('timerStatus');
const barFill    = document.getElementById('timerBarFill');
const lapsList   = document.getElementById('lapsList');
const lapsEmpty  = document.getElementById('lapsEmpty');
const lapsCount  = document.getElementById('lapsCount');
const startBtn   = document.getElementById('startBtn');
const lapBtn     = document.getElementById('lapBtn');
const resetBtn   = document.getElementById('resetBtn');

/**
 * Format milliseconds → { h, m, s, ms }
 */
function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const h  = Math.floor(totalSeconds / 3600);
  const m  = Math.floor((totalSeconds % 3600) / 60);
  const s  = totalSeconds % 60;
  const ms3 = Math.floor(ms % 1000);
  return {
    h:  String(h).padStart(2, '0'),
    m:  String(m).padStart(2, '0'),
    s:  String(s).padStart(2, '0'),
    ms: String(ms3).padStart(3, '0')
  };
}

/**
 * Render current elapsed time to DOM
 */
function render(ms) {
  const { h, m, s, ms: msStr } = formatTime(ms);
  hoursEl.textContent   = h;
  minutesEl.textContent = m;
  secondsEl.textContent = s;
  msEl.textContent      = msStr;

  // Animate progress bar — cycles every 60 seconds
  const cycleMs  = 60_000;
  const progress = ((ms % cycleMs) / cycleMs) * 100;
  barFill.style.width = progress + '%';
}

/**
 * Main animation loop — uses performance.now() for precision
 */
function tick() {
  elapsed = performance.now() - startTime;
  render(elapsed);
  animFrameId = requestAnimationFrame(tick);
}

/* ── Controls ── */

/**
 * Start or resume the timer
 */
function startTimer() {
  if (state === 'idle' || state === 'paused') {
    // Store start reference (accounting for already-elapsed time)
    startTime = performance.now() - elapsed;
    lapStartTime = elapsed - (laps.length > 0 ? laps.reduce((a, l) => a + l.split, 0) : elapsed);

    state = 'running';
    animFrameId = requestAnimationFrame(tick);

    // Update UI
    startBtn.querySelector('.btn-icon').textContent  = '⏸';
    startBtn.querySelector('.btn-label').textContent = 'PAUSE';
    startBtn.className = 'ctrl-btn btn-start';
    startBtn.style.borderColor = 'rgba(255,215,0,.4)';
    startBtn.querySelector('.btn-icon').style.color = 'var(--yellow)';
    startBtn.querySelector('.btn-label').style.color = 'var(--yellow)';

    lapBtn.disabled   = false;
    resetBtn.disabled = false;

    statusEl.textContent = 'RUNNING';
    statusEl.className   = 'timer-status running';
  } else if (state === 'running') {
    pauseTimer();
  }
}

/**
 * Pause the timer
 */
function pauseTimer() {
  if (state !== 'running') return;
  cancelAnimationFrame(animFrameId);
  state = 'paused';

  startBtn.querySelector('.btn-icon').textContent  = '▶';
  startBtn.querySelector('.btn-label').textContent = 'RESUME';
  startBtn.style.borderColor = 'rgba(0,255,136,.3)';
  startBtn.querySelector('.btn-icon').style.color = 'var(--green)';
  startBtn.querySelector('.btn-label').style.color = 'var(--green)';

  statusEl.textContent = 'PAUSED';
  statusEl.className   = 'timer-status paused';
}

/**
 * Reset everything
 */
function resetTimer() {
  cancelAnimationFrame(animFrameId);
  state    = 'idle';
  elapsed  = 0;
  laps     = [];
  lapStartTime = 0;

  render(0);
  barFill.style.width = '0%';

  // Reset buttons
  startBtn.querySelector('.btn-icon').textContent  = '▶';
  startBtn.querySelector('.btn-label').textContent = 'START';
  startBtn.style.borderColor = '';
  startBtn.querySelector('.btn-icon').style.color = '';
  startBtn.querySelector('.btn-label').style.color = '';
  lapBtn.disabled   = true;
  resetBtn.disabled = true;

  statusEl.textContent = 'STANDBY';
  statusEl.className   = 'timer-status';

  // Clear laps list
  lapsList.innerHTML = '';
  lapsList.appendChild(lapsEmpty);
  lapsEmpty.style.display = 'flex';
  lapsCount.textContent = '0 LAPS';
}

/**
 * Record a lap
 */
function recordLap() {
  if (state !== 'running') return;

  // Calculate elapsed since last lap
  const totalLapMs = laps.reduce((a, l) => a + l.split, 0);
  const splitMs    = elapsed - totalLapMs;

  laps.push({ split: splitMs, total: elapsed });
  renderLaps();
}

/**
 * Re-render the entire laps list with best/worst highlighting
 */
function renderLaps() {
  if (laps.length === 0) {
    lapsList.innerHTML = '';
    lapsList.appendChild(lapsEmpty);
    lapsEmpty.style.display = 'flex';
    lapsCount.textContent = '0 LAPS';
    return;
  }

  lapsEmpty.style.display = 'none';
  lapsCount.textContent = `${laps.length} LAP${laps.length > 1 ? 'S' : ''}`;

  // Find best/worst splits (ignore if only 1 lap)
  const splits = laps.map(l => l.split);
  const minSplit = Math.min(...splits);
  const maxSplit = Math.max(...splits);

  // Rebuild list (most recent first)
  lapsList.innerHTML = '';

  // Reverse iterate so newest is on top
  for (let i = laps.length - 1; i >= 0; i--) {
    const lap = laps[i];
    const { h, m, s, ms } = formatTime(lap.split);
    const { h: th, m: tm, s: ts, ms: tms } = formatTime(lap.total);

    // Delta vs previous lap
    let deltaHtml = '<span class="lap-delta delta-neutral">—</span>';
    if (i > 0 && laps.length > 2) {
      const diff = lap.split - laps[i - 1].split;
      const { m: dm, s: ds, ms: dms } = formatTime(Math.abs(diff));
      const sign = diff > 0 ? '+' : '-';
      const cls  = diff > 0 ? 'delta-worst' : 'delta-best';
      deltaHtml  = `<span class="lap-delta ${cls}">${sign}${ds}.${dms.slice(0,2)}</span>`;
    }

    const isBest  = laps.length > 1 && lap.split === minSplit;
    const isWorst = laps.length > 1 && lap.split === maxSplit;
    const rowClass = isBest ? 'lap-row best' : isWorst ? 'lap-row worst' : 'lap-row';

    const row = document.createElement('div');
    row.className = rowClass;
    row.innerHTML = `
      <span class="lap-num">#${i + 1}</span>
      <span class="lap-split">${m}:${s}.${ms.slice(0,2)}</span>
      <span class="lap-total">${tm}:${ts}.${tms.slice(0,2)}</span>
      ${deltaHtml}
    `;
    lapsList.appendChild(row);
  }
}


/* ═══════════════════════════════════
   2. KEYBOARD SHORTCUTS
   ═══════════════════════════════════ */

document.addEventListener('keydown', (e) => {
  // Ignore when focused on form inputs
  if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

  switch (e.code) {
    case 'Space':
      e.preventDefault();
      startTimer();
      break;
    case 'KeyL':
      if (!lapBtn.disabled) recordLap();
      break;
    case 'KeyR':
      if (!resetBtn.disabled) resetTimer();
      break;
  }
});


/* ═══════════════════════════════════
   3. NAVBAR — Scroll + Hamburger
   ═══════════════════════════════════ */

const navbar    = document.getElementById('navbar');
const hamburger = document.getElementById('hamburger');
const navLinks  = document.getElementById('navLinks');
const navLinkEls = document.querySelectorAll('.nav-link');

// Toggle scrolled class
function handleNavScroll() {
  if (window.scrollY > 60) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }
}
window.addEventListener('scroll', handleNavScroll, { passive: true });
handleNavScroll(); // run on load

// Hamburger menu toggle
hamburger.addEventListener('click', () => {
  hamburger.classList.toggle('open');
  navLinks.classList.toggle('open');
});

// Close menu on link click
navLinkEls.forEach(link => {
  link.addEventListener('click', () => {
    hamburger.classList.remove('open');
    navLinks.classList.remove('open');
  });
});

// Close menu on outside click
document.addEventListener('click', (e) => {
  if (!navbar.contains(e.target)) {
    hamburger.classList.remove('open');
    navLinks.classList.remove('open');
  }
});


/* ═══════════════════════════════════
   4. ACTIVE NAV LINK (IntersectionObserver)
   ═══════════════════════════════════ */

const sections = document.querySelectorAll('.section');

const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const id = entry.target.id;
      navLinkEls.forEach(link => {
        link.classList.toggle('active', link.dataset.section === id);
      });
    }
  });
}, { threshold: 0.4 });

sections.forEach(s => sectionObserver.observe(s));


/* ═══════════════════════════════════
   5. SCROLL PROGRESS BAR
   ═══════════════════════════════════ */

const progressBar = document.getElementById('scrollProgress');

function updateScrollProgress() {
  const scrollTop    = window.scrollY;
  const docHeight    = document.documentElement.scrollHeight - window.innerHeight;
  const progress     = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
  progressBar.style.width = progress + '%';
}
window.addEventListener('scroll', updateScrollProgress, { passive: true });


/* ═══════════════════════════════════
   6. BACK TO TOP BUTTON
   ═══════════════════════════════════ */

const backToTopBtn = document.getElementById('backToTop');

function toggleBackToTop() {
  backToTopBtn.classList.toggle('visible', window.scrollY > 400);
}
window.addEventListener('scroll', toggleBackToTop, { passive: true });

backToTopBtn.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});


/* ═══════════════════════════════════
   7. FEATURE CARDS — Scroll Reveal
   ═══════════════════════════════════ */

const featureCards = document.querySelectorAll('.feature-card');

const cardObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const delay = parseInt(entry.target.dataset.delay) || 0;
      setTimeout(() => entry.target.classList.add('visible'), delay);
      cardObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

featureCards.forEach(card => cardObserver.observe(card));


/* ═══════════════════════════════════
   8. CONTACT FORM HANDLER
   ═══════════════════════════════════ */

function handleContact(btn) {
  const form    = btn.closest('.contact-form');
  const inputs  = form.querySelectorAll('.form-input');
  let valid     = true;

  inputs.forEach(inp => {
    if (!inp.value.trim()) {
      inp.style.borderColor = 'var(--magenta)';
      inp.style.boxShadow   = '0 0 0 1px rgba(255,0,170,.3)';
      valid = false;
    } else {
      inp.style.borderColor = '';
      inp.style.boxShadow   = '';
    }
  });

  if (!valid) return;

  // Simulate send
  btn.textContent = 'TRANSMITTING...';
  btn.disabled    = true;

  setTimeout(() => {
    inputs.forEach(inp => inp.value = '');
    btn.textContent = 'TRANSMIT →';
    btn.disabled    = false;
    showToast('// MESSAGE TRANSMITTED SUCCESSFULLY');
  }, 1200);
}

/**
 * Show a temporary toast notification
 */
function showToast(msg) {
  // Remove existing toasts
  document.querySelectorAll('.toast').forEach(t => t.remove());

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  document.body.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add('show'));
  });

  // Auto-dismiss after 3s
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 3000);
}


/* ═══════════════════════════════════
   9. SMOOTH SCROLLING FOR ANCHOR LINKS
   ═══════════════════════════════════ */

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', (e) => {
    const target = document.querySelector(anchor.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth' });
    }
  });
});


/* ═══════════════════════════════════
   10. INIT
   ═══════════════════════════════════ */

// Initialize display
render(0);

// Expose functions globally (called from HTML onclick attrs)
window.startTimer  = startTimer;
window.recordLap   = recordLap;
window.resetTimer  = resetTimer;
window.handleContact = handleContact;

console.log('%c[CHRONO] Precision timer initialized.', 'color:#00f5ff; font-family:monospace; font-size:12px;');
