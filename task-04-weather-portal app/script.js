/* ═══════════════════════════════════════════════════════════
   ATMOS — Weather Intelligence Portal · script.js
   API: OpenWeatherMap (free tier)
   ═══════════════════════════════════════════════════════════

   SETUP: Replace YOUR_API_KEY below with your free key from
   https://openweathermap.org/api  (takes ~10 min to activate)
   ═══════════════════════════════════════════════════════════ */

'use strict';

/* ════════════════════════════════
   CONFIG
════════════════════════════════ */
const CONFIG = {
  API_KEY:  '5ab76b83b108251b60ca71ba46a9c6f5',           // ← Replace this
  BASE_URL: 'https://api.openweathermap.org/data/2.5',
  GEO_URL:  'https://api.openweathermap.org/geo/1.0',
  ICON_URL: 'https://openweathermap.org/img/wn',
  UNITS:    'metric',                  // metric | imperial
};

/* ════════════════════════════════
   STATE
════════════════════════════════ */
let appState = {
  unit:        'C',          // C | F
  rawTempC:    null,         // Store raw Celsius values for unit toggle
  rawFeelsC:   null,
  rawMaxC:     null,
  rawMinC:     null,
  rawForecast: null,
  rawHourly:   null,
  currentCity: '',
  coords:      null,
};

/* ════════════════════════════════
   DOM REFS
════════════════════════════════ */
const $ = id => document.getElementById(id);

const els = {
  searchInput:    $('searchInput'),
  searchBtn:      $('searchBtn'),
  geoBtn:         $('geoBtn'),
  suggestions:    $('suggestions'),
  loadingOverlay: $('loadingOverlay'),
  loadingText:    $('loadingText'),
  errorPanel:     $('errorPanel'),
  errorMsg:       $('errorMsg'),
  dashboard:      $('dashboard'),
  emptyState:     $('emptyState'),
  bgOverlay:      $('bgOverlay'),
  liveDot:        document.querySelector('.live-dot'),
  liveLabel:      $('liveLabel'),
  headerTime:     $('headerTime'),
  footerCoords:   $('footerCoords'),

  // Weather values
  cityName:       $('cityName'),
  countryName:    $('countryName'),
  tempValue:      $('tempValue'),
  weatherIconImg: $('weatherIconImg'),
  conditionBadge: $('conditionBadge'),
  feelsLike:      $('feelsLike'),
  tempMax:        $('tempMax'),
  tempMin:        $('tempMin'),
  lastUpdated:    $('lastUpdated'),
  humidity:       $('humidity'),
  humidityBar:    $('humidityBar'),
  windSpeed:      $('windSpeed'),
  compassNeedle:  $('compassNeedle'),
  windDir:        $('windDir'),
  pressure:       $('pressure'),
  pressureArc:    $('pressureArc'),
  visibility:     $('visibility'),
  sunrise:        $('sunrise'),
  sunset:         $('sunset'),
  daylight:       $('daylight'),
  sunProgressArc: $('sunProgressArc'),
  sunDot:         $('sunDot'),
  sunDotGlow:     $('sunDotGlow'),
  cloudCircle:    $('cloudCircle'),
  cloudVal:       $('cloudVal'),
  humCircle:      $('humCircle'),
  humVal:         $('humVal'),
  visCircle:      $('visCircle'),
  visVal:         $('visVal'),
  forecastGrid:   $('forecastGrid'),
  hourlyScroll:   $('hourlyScroll'),
};

/* ════════════════════════════════
   UTILITIES
════════════════════════════════ */

/** Convert Celsius to Fahrenheit */
const toF = c => Math.round(c * 9/5 + 32);

/** Format temperature with unit */
const fmtTemp = (c, unit) => unit === 'C' ? `${Math.round(c)}°C` : `${toF(c)}°F`;

/** Format Unix timestamp to HH:MM */
function fmtTime(unix, tz = 0) {
  const d = new Date((unix + tz) * 1000);
  const h = String(d.getUTCHours()).padStart(2, '0');
  const m = String(d.getUTCMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

/** Format Unix timestamp to Day name */
function fmtDay(unix) {
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const d = new Date(unix * 1000);
  return days[d.getDay()];
}

/** Get cardinal direction from degrees */
function degToCard(deg) {
  const dirs = ['N','NE','E','SE','S','SW','W','NW'];
  return dirs[Math.round(deg / 45) % 8];
}

/** Convert wind speed m/s to km/h */
const msToKmh = ms => (ms * 3.6).toFixed(1);

/** Map weather condition ID to background gradient */
function conditionToGradient(id) {
  if (id >= 200 && id < 300) return 'radial-gradient(ellipse 80% 60% at 30% -10%, rgba(55,48,107,0.6), transparent)';
  if (id >= 300 && id < 500) return 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(30,58,138,0.5), transparent)';
  if (id >= 500 && id < 600) return 'radial-gradient(ellipse 80% 60% at 40% -10%, rgba(30,64,175,0.6), transparent)';
  if (id >= 600 && id < 700) return 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(147,197,253,0.15), transparent)';
  if (id >= 700 && id < 800) return 'radial-gradient(ellipse 80% 60% at 60% -10%, rgba(107,114,128,0.4), transparent)';
  if (id === 800)             return 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(245,158,11,0.2), transparent)';
  if (id > 800)               return 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(100,116,139,0.3), transparent)';
  return 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(15,23,42,0.8), transparent)';
}

/** Animate a value counter */
function animateValue(el, from, to, duration = 800, suffix = '') {
  const start = performance.now();
  function step(now) {
    const progress = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(from + (to - from) * ease) + suffix;
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/* ════════════════════════════════
   LIVE CLOCK
════════════════════════════════ */
function updateClock() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  els.headerTime.textContent = `${h}:${m}:${s}`;
}
setInterval(updateClock, 1000);
updateClock();

/* ════════════════════════════════
   LOADING / ERROR / STATE HELPERS
════════════════════════════════ */
function showLoading(msg = 'ACQUIRING SIGNAL...') {
  els.loadingText.textContent = msg;
  els.loadingOverlay.classList.add('visible');
  els.errorPanel.classList.remove('visible');
  els.dashboard.classList.remove('visible');
  els.emptyState.style.display = 'none';
}

function hideLoading() {
  els.loadingOverlay.classList.remove('visible');
}

function showError(msg) {
  hideLoading();
  els.errorMsg.textContent = msg;
  els.errorPanel.classList.add('visible');
  els.dashboard.classList.remove('visible');
  els.emptyState.style.display = 'none';
  els.liveDot.classList.remove('active');
  els.liveLabel.textContent = 'SIGNAL LOST';
}

function hideError() {
  els.errorPanel.classList.remove('visible');
  els.emptyState.style.display = 'flex';
}

function showDashboard() {
  hideLoading();
  els.errorPanel.classList.remove('visible');
  els.emptyState.style.display = 'none';
  els.dashboard.classList.add('visible');
  els.liveDot.classList.add('active');
}

/* ════════════════════════════════
   API CALLS
════════════════════════════════ */

/**
 * Fetch current weather by city name
 */
async function fetchWeatherByCity(city) {
  const url = `${CONFIG.BASE_URL}/weather?q=${encodeURIComponent(city)}&appid=${CONFIG.API_KEY}&units=metric`;
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 404) throw new Error('City not found. Check the spelling and try again.');
    if (res.status === 401) throw new Error('Invalid API key. Please check your configuration.');
    throw new Error(`Weather service error (${res.status}). Try again later.`);
  }
  return res.json();
}

/**
 * Fetch current weather by coordinates
 */
async function fetchWeatherByCoords(lat, lon) {
  const url = `${CONFIG.BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${CONFIG.API_KEY}&units=metric`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Location lookup failed (${res.status}).`);
  return res.json();
}

/**
 * Fetch 5-day forecast (3-hour intervals) by coordinates
 */
async function fetchForecastByCoords(lat, lon) {
  const url = `${CONFIG.BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${CONFIG.API_KEY}&units=metric`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Forecast unavailable.');
  return res.json();
}

/**
 * Geocode city name to coordinates (for autocomplete)
 */
async function geocodeCity(query) {
  const url = `${CONFIG.GEO_URL}/direct?q=${encodeURIComponent(query)}&limit=5&appid=${CONFIG.API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  return res.json();
}

/* ════════════════════════════════
   SEARCH HANDLERS
════════════════════════════════ */

async function handleSearch() {
  const city = els.searchInput.value.trim();
  if (!city) return;
  hideSuggestions();
  await loadWeather(city, null);
}

async function fetchByGeolocation() {
  if (!navigator.geolocation) {
    showError('Geolocation is not supported by your browser.');
    return;
  }
  els.geoBtn.classList.add('loading');
  showLoading('TRIANGULATING POSITION...');

  navigator.geolocation.getCurrentPosition(
    async ({ coords }) => {
      els.geoBtn.classList.remove('loading');
      await loadWeather(null, { lat: coords.latitude, lon: coords.longitude });
    },
    (err) => {
      els.geoBtn.classList.remove('loading');
      const msgs = {
        1: 'Location access denied. Please allow location permission.',
        2: 'Position unavailable. Try searching by city name.',
        3: 'Location request timed out. Try again.',
      };
      showError(msgs[err.code] || 'Geolocation failed.');
    },
    { timeout: 10000, maximumAge: 300000 }
  );
}

/**
 * Main weather loader — accepts city name OR coords
 */
async function loadWeather(city, coords) {
  showLoading(city ? 'SCANNING ATMOSPHERE...' : 'READING SENSORS...');

  try {
    let currentData, forecastData;

    if (city) {
      currentData  = await fetchWeatherByCity(city);
      forecastData = await fetchForecastByCoords(currentData.coord.lat, currentData.coord.lon);
    } else {
      [currentData, forecastData] = await Promise.all([
        fetchWeatherByCoords(coords.lat, coords.lon),
        fetchForecastByCoords(coords.lat, coords.lon),
      ]);
    }

    // Store state
    appState.currentCity = currentData.name;
    appState.coords      = { lat: currentData.coord.lat, lon: currentData.coord.lon };

    // Render
    renderCurrent(currentData);
    renderForecast(forecastData);
    renderHourly(forecastData);

    showDashboard();
    els.liveLabel.textContent = currentData.name.toUpperCase();

    // Update footer
    els.footerCoords.textContent =
      `${currentData.coord.lat.toFixed(3)}°N  ${currentData.coord.lon.toFixed(3)}°E`;

  } catch (err) {
    showError(err.message || 'An unexpected error occurred.');
    console.error('[ATMOS]', err);
  }
}

/* ════════════════════════════════
   RENDER CURRENT WEATHER
════════════════════════════════ */
function renderCurrent(data) {
  const tz     = data.timezone;
  const unitSym = appState.unit;

  // Store raw Celsius
  appState.rawTempC  = data.main.temp;
  appState.rawFeelsC = data.main.feels_like;
  appState.rawMaxC   = data.main.temp_max;
  appState.rawMinC   = data.main.temp_min;

  // Location
  els.cityName.textContent    = data.name;
  els.countryName.textContent = `${data.sys.country} · ${data.coord.lat.toFixed(2)}°N ${data.coord.lon.toFixed(2)}°E`;

  // Temperature
  els.tempValue.textContent = fmtTemp(data.main.temp, unitSym);
  els.feelsLike.textContent = `Feels like ${fmtTemp(data.main.feels_like, unitSym)}`;
  els.tempMax.textContent   = fmtTemp(data.main.temp_max, unitSym);
  els.tempMin.textContent   = fmtTemp(data.main.temp_min, unitSym);

  // Icon & condition
  const iconCode = data.weather[0].icon;
  els.weatherIconImg.src = `${CONFIG.ICON_URL}/${iconCode}@2x.png`;
  els.conditionBadge.textContent = data.weather[0].description.toUpperCase();

  // Last updated
  els.lastUpdated.textContent = fmtTime(data.dt, tz);

  // ── Humidity
  els.humidity.textContent = `${data.main.humidity}%`;
  setTimeout(() => { els.humidityBar.style.width = `${data.main.humidity}%`; }, 200);

  // ── Wind
  const windKmh = msToKmh(data.wind.speed);
  els.windSpeed.textContent = `${windKmh} km/h`;
  const windDeg = data.wind.deg || 0;
  els.compassNeedle.style.transform = `rotate(${windDeg}deg)`;
  els.windDir.textContent = degToCard(windDeg);

  // ── Pressure (range 970–1050 hPa, map to 0–180°)
  const presVal = data.main.pressure;
  els.pressure.textContent = `${presVal} hPa`;
  const pressPct = Math.min(Math.max((presVal - 970) / (1050 - 970), 0), 1);
  // Arc total length ≈ 113 for the path
  const arcLen = 113;
  setTimeout(() => {
    els.pressureArc.style.strokeDasharray = `${pressPct * arcLen} ${arcLen}`;
  }, 300);

  // ── Visibility
  const visKm = (data.visibility / 1000).toFixed(1);
  els.visibility.textContent = `${visKm} km`;

  // ── Sunrise / Sunset
  const sunriseTime = fmtTime(data.sys.sunrise, tz);
  const sunsetTime  = fmtTime(data.sys.sunset,  tz);
  els.sunrise.textContent = sunriseTime;
  els.sunset.textContent  = sunsetTime;

  // Daylight duration
  const daylightSec = data.sys.sunset - data.sys.sunrise;
  const dlH = Math.floor(daylightSec / 3600);
  const dlM = Math.floor((daylightSec % 3600) / 60);
  els.daylight.textContent = `${dlH}h ${dlM}m`;

  // ── Sun arc position
  renderSunArc(data.sys.sunrise, data.sys.sunset, tz);

  // ── Atmosphere rings
  const cloudPct = data.clouds?.all ?? 0;
  const humPct   = data.main.humidity;
  const visPct   = Math.min((data.visibility / 10000) * 100, 100);
  const circum   = 2 * Math.PI * 24; // ~150.8

  setTimeout(() => {
    els.cloudCircle.style.strokeDasharray = `${(cloudPct / 100) * circum} ${circum}`;
    els.humCircle.style.strokeDasharray   = `${(humPct   / 100) * circum} ${circum}`;
    els.visCircle.style.strokeDasharray   = `${(visPct   / 100) * circum} ${circum}`;
    els.cloudVal.textContent = `${cloudPct}%`;
    els.humVal.textContent   = `${humPct}%`;
    els.visVal.textContent   = `${Math.round(visPct)}%`;
  }, 400);

  // ── Dynamic background
  els.bgOverlay.style.background = conditionToGradient(data.weather[0].id);
}

/* ════════════════════════════════
   SUN ARC
════════════════════════════════ */
function renderSunArc(sunriseUnix, sunsetUnix, tz) {
  const now        = Math.floor(Date.now() / 1000);
  const totalDay   = sunsetUnix - sunriseUnix;
  const elapsed    = Math.max(0, Math.min(now - sunriseUnix, totalDay));
  const progress   = elapsed / totalDay;           // 0→1

  // Arc path: M20 140 A130 130 0 0 1 280 140, total length ≈ 408
  const arcTotal = 408;
  els.sunProgressArc.style.strokeDasharray = `${progress * arcTotal} ${arcTotal}`;

  // Calculate sun dot position along the arc (semi-circle)
  // Arc goes from (20,140) to (280,140), center (150,140), r=130
  const angle = Math.PI - (progress * Math.PI); // π → 0 (left to right)
  const cx    = 150 + 130 * Math.cos(angle);
  const cy    = 140 - 130 * Math.sin(angle);

  els.sunDot.setAttribute('cx', cx.toFixed(1));
  els.sunDot.setAttribute('cy', cy.toFixed(1));
  els.sunDotGlow.setAttribute('cx', cx.toFixed(1));
  els.sunDotGlow.setAttribute('cy', cy.toFixed(1));
}

/* ════════════════════════════════
   RENDER 5-DAY FORECAST
════════════════════════════════ */
function renderForecast(data) {
  appState.rawForecast = data;
  const unit = appState.unit;

  // Group forecasts by day — pick midday reading for each day
  const dailyMap = {};
  data.list.forEach(item => {
    const date = new Date(item.dt * 1000);
    const dayKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    const hour   = date.getHours();
    // Prefer 12:00 reading; otherwise take first available
    if (!dailyMap[dayKey] || Math.abs(hour - 12) < Math.abs(new Date(dailyMap[dayKey].dt * 1000).getHours() - 12)) {
      dailyMap[dayKey] = item;
    }
  });

  const days = Object.values(dailyMap).slice(0, 5);
  els.forecastGrid.innerHTML = '';

  days.forEach((day, i) => {
    const iconCode = day.weather[0].icon;
    const high     = day.main.temp_max;
    const low      = day.main.temp_min;
    const desc     = day.weather[0].description;
    const dayName  = i === 0 ? 'TODAY' : fmtDay(day.dt);

    const item = document.createElement('div');
    item.className = 'forecast-item';
    item.style.animationDelay = `${i * 0.07}s`;
    item.innerHTML = `
      <div class="forecast-day">${dayName}</div>
      <div class="forecast-icon"><img src="${CONFIG.ICON_URL}/${iconCode}@2x.png" alt="${desc}" /></div>
      <div class="forecast-high">${fmtTemp(high, unit)}</div>
      <div class="forecast-low">${fmtTemp(low, unit)}</div>
      <div class="forecast-desc">${desc}</div>
    `;
    els.forecastGrid.appendChild(item);
  });
}

/* ════════════════════════════════
   RENDER HOURLY FORECAST
════════════════════════════════ */
function renderHourly(data) {
  appState.rawHourly = data;
  const unit = appState.unit;
  const now  = Math.floor(Date.now() / 1000);

  // Take next 12 entries (36h)
  const slots = data.list.slice(0, 12);
  els.hourlyScroll.innerHTML = '';

  slots.forEach((slot, i) => {
    const isCurrent = i === 0 || Math.abs(slot.dt - now) < 5400;
    const iconCode  = slot.weather[0].icon;
    const temp      = slot.main.temp;
    const timeStr   = fmtTime(slot.dt);
    const rainPct   = slot.pop ? `${Math.round(slot.pop * 100)}%` : '';

    const item = document.createElement('div');
    item.className = `hourly-item${i === 0 ? ' current' : ''}`;
    item.style.animationDelay = `${i * 0.04}s`;
    item.innerHTML = `
      <div class="hourly-time">${i === 0 ? 'NOW' : timeStr}</div>
      <div class="hourly-icon"><img src="${CONFIG.ICON_URL}/${iconCode}.png" alt="" /></div>
      <div class="hourly-temp">${fmtTemp(temp, unit)}</div>
      ${rainPct ? `<div class="hourly-rain">💧 ${rainPct}</div>` : ''}
    `;
    els.hourlyScroll.appendChild(item);
  });
}

/* ════════════════════════════════
   UNIT TOGGLE (C / F)
════════════════════════════════ */
function switchUnit(unit) {
  if (appState.unit === unit) return;
  appState.unit = unit;

  $('btnC').classList.toggle('active', unit === 'C');
  $('btnF').classList.toggle('active', unit === 'F');

  // Re-render temperatures if data is available
  if (appState.rawTempC === null) return;

  els.tempValue.textContent = fmtTemp(appState.rawTempC,  unit);
  els.feelsLike.textContent = `Feels like ${fmtTemp(appState.rawFeelsC, unit)}`;
  els.tempMax.textContent   = fmtTemp(appState.rawMaxC, unit);
  els.tempMin.textContent   = fmtTemp(appState.rawMinC, unit);

  // Re-render forecast and hourly
  if (appState.rawForecast) renderForecast(appState.rawForecast);
  if (appState.rawHourly)   renderHourly(appState.rawHourly);
}

/* ════════════════════════════════
   AUTOCOMPLETE / SUGGESTIONS
════════════════════════════════ */
let debounceTimer = null;

els.searchInput.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  const val = els.searchInput.value.trim();
  if (val.length < 2) { hideSuggestions(); return; }

  debounceTimer = setTimeout(() => fetchSuggestions(val), 350);
});

async function fetchSuggestions(query) {
  try {
    const results = await geocodeCity(query);
    if (!results.length) { hideSuggestions(); return; }

    els.suggestions.innerHTML = '';
    results.slice(0, 5).forEach(place => {
      const item = document.createElement('div');
      item.className = 'suggestion-item';
      const flag = place.country ? getFlagEmoji(place.country) : '🌍';
      const label = [place.name, place.state, place.country].filter(Boolean).join(', ');

      item.innerHTML = `<span class="suggestion-flag">${flag}</span><span>${label}</span>`;
      item.addEventListener('click', () => {
        els.searchInput.value = place.name;
        hideSuggestions();
        loadWeather(null, { lat: place.lat, lon: place.lon });
      });
      els.suggestions.appendChild(item);
    });

    els.suggestions.style.display = 'block';
  } catch {
    hideSuggestions();
  }
}

function hideSuggestions() {
  els.suggestions.style.display = 'none';
  els.suggestions.innerHTML = '';
}

document.addEventListener('click', e => {
  if (!e.target.closest('.search-section')) hideSuggestions();
});

/** Convert ISO 3166-1 alpha-2 code to flag emoji */
function getFlagEmoji(code) {
  return code.toUpperCase().replace(/./g, c =>
    String.fromCodePoint(127397 + c.charCodeAt())
  );
}

/* ════════════════════════════════
   KEYBOARD SHORTCUTS
════════════════════════════════ */
els.searchInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') handleSearch();
  if (e.key === 'Escape') hideSuggestions();
});

document.addEventListener('keydown', e => {
  if (e.key === '/' && document.activeElement !== els.searchInput) {
    e.preventDefault();
    els.searchInput.focus();
  }
});

/* ════════════════════════════════
   PARTICLE CANVAS
════════════════════════════════ */
(function initParticles() {
  const canvas = $('particleCanvas');
  const ctx    = canvas.getContext('2d');
  let W, H, particles = [];

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  class Particle {
    constructor() { this.reset(); }
    reset() {
      this.x    = Math.random() * W;
      this.y    = Math.random() * H;
      this.vx   = (Math.random() - .5) * .3;
      this.vy   = -Math.random() * .5 - .1;
      this.r    = Math.random() * 1.5 + .5;
      this.a    = Math.random() * .4 + .1;
      this.life = 0;
      this.maxL = Math.random() * 300 + 200;
    }
    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.life++;
      if (this.life > this.maxL || this.y < -10) this.reset();
    }
    draw() {
      const alpha = this.a * Math.sin((this.life / this.maxL) * Math.PI);
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(245,158,11,${alpha})`;
      ctx.fill();
    }
  }

  function init() {
    resize();
    particles = Array.from({ length: 80 }, () => new Particle());
  }

  function loop() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => { p.update(); p.draw(); });
    requestAnimationFrame(loop);
  }

  window.addEventListener('resize', resize);
  init();
  loop();
})();

/* ════════════════════════════════
   INIT
════════════════════════════════ */
(function init() {
  // Check for saved city in sessionStorage
  const lastCity = sessionStorage.getItem('atmos_last_city');
  if (lastCity) {
    els.searchInput.value = lastCity;
    loadWeather(lastCity, null);
  }

  // Save city on successful load
  const origShow = showDashboard;
  window.showDashboard = function() {
    origShow();
    if (appState.currentCity) {
      sessionStorage.setItem('atmos_last_city', appState.currentCity);
    }
  };
})();

// Expose globals used from HTML
window.handleSearch        = handleSearch;
window.fetchByGeolocation  = fetchByGeolocation;
window.switchUnit          = switchUnit;
window.hideError           = hideError;

console.log('%c[ATMOS] Weather Intelligence Portal · Ready', 'color:#f59e0b; font-family:monospace; font-size:11px;');
console.log('%c[ATMOS] Replace YOUR_API_KEY in script.js to activate.', 'color:#64748b; font-family:monospace; font-size:11px;');