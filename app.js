/* ═══════════════════════════════════════════════════════
   SLOT RADAR — Agentic AI Booking Agent
   Main application logic: radar engine, monitoring,
   auto-fill demo, notifications, and orchestration.
   ═══════════════════════════════════════════════════════ */

/* ──────────────── CONFIG ──────────────── */
const PORTALS = [
  {
    id: 'vfs-uk',
    name: 'VFS Global — UK',
    type: 'Tourist Visa Appointment',
    icon: '🇬🇧',
    interval: 8,
    location: 'New Delhi VFS Centre',
    color: '#00f5ff'
  },
  {
    id: 'vfs-us',
    name: 'VFS Global — US',
    type: 'B1/B2 Visa Slot',
    icon: '🇺🇸',
    interval: 10,
    location: 'Mumbai VFS Centre',
    color: '#7b61ff'
  },
  {
    id: 'irctc-tatkal',
    name: 'IRCTC Tatkal',
    type: 'Tatkal Train Booking',
    icon: '🚂',
    interval: 5,
    location: 'Online — irctc.co.in',
    color: '#ff9f43'
  },
  {
    id: 'vfs-schengen',
    name: 'VFS — Schengen',
    type: 'Schengen Visa Appointment',
    icon: '🇪🇺',
    interval: 12,
    location: 'Bangalore VFS Centre',
    color: '#3b82f6'
  },
  {
    id: 'cgi-federal',
    name: 'CGI Federal',
    type: 'US Visa Interview',
    icon: '🗽',
    interval: 15,
    location: 'Chennai US Consulate',
    color: '#00ff88'
  },
  {
    id: 'canada-vac',
    name: 'Canada VAC',
    type: 'Canada Visitor Visa',
    icon: '🇨🇦',
    interval: 10,
    location: 'Hyderabad VAC',
    color: '#ff3366'
  }
];

const DEMO_FIELDS = [
  { label: 'Name', value: 'Rahul Sharma' },
  { label: 'Passport', value: 'M7234561' },
  { label: 'DOB', value: '1995-03-15' },
  { label: 'Email', value: 'rahul.sharma@email.com' },
  { label: 'Phone', value: '+91 98765 43210' },
  { label: 'Nation', value: 'Indian' }
];

const SLOT_SCENARIOS = [
  { portal: 'vfs-uk', date: '2026-09-12', time: '10:30 AM', location: 'New Delhi VFS Centre', category: 'Tourist Visa — Standard' },
  { portal: 'irctc-tatkal', date: '2026-08-22', time: '10:00 AM', location: 'Rajdhani Exp 12301', category: 'Tatkal — 2A' },
  { portal: 'vfs-us', date: '2026-10-05', time: '09:15 AM', location: 'Mumbai VFS Centre', category: 'B1/B2 — Interview' },
  { portal: 'cgi-federal', date: '2026-09-28', time: '08:00 AM', location: 'Chennai US Consulate', category: 'H1B Visa — Stamping' },
  { portal: 'vfs-schengen', date: '2026-09-18', time: '11:00 AM', location: 'Bangalore VFS Centre', category: 'Schengen — Short Stay' },
  { portal: 'canada-vac', date: '2026-10-01', time: '02:30 PM', location: 'Hyderabad VAC', category: 'Visitor Visa — Single Entry' }
];


/* ──────────────── ACTIVITY LOGGER ──────────────── */
class ActivityLogger {
  constructor() {
    this.el = document.getElementById('log-scroll');
    this.entries = [];
    this.activeFilter = 'all';
    this._initFilters();
    this._initClear();
    this.log('Slot Radar AI initialized. Standing by.', 'sys');
  }

  log(message, type = 'info') {
    const now = new Date();
    const ts = now.toTimeString().slice(0, 8);
    const entry = { message, type, ts, el: null };

    const div = document.createElement('div');
    div.className = `log-entry ${type === 'alert' ? 'alert-entry' : ''} ${type === 'success' ? 'success-entry' : ''}`;
    div.dataset.type = type;
    div.innerHTML = `
      <span class="log-time">${ts}</span>
      <span class="log-badge ${type}">${type.toUpperCase()}</span>
      <span class="log-message">${message}</span>
    `;

    entry.el = div;
    this.entries.push(entry);
    this.el.appendChild(div);

    // Apply current filter
    if (this.activeFilter !== 'all' && type !== this.activeFilter && !(this.activeFilter === 'alert' && type === 'alert')) {
      div.classList.add('hidden');
    }

    // Auto-scroll
    requestAnimationFrame(() => {
      this.el.scrollTop = this.el.scrollHeight;
    });
  }

  _initFilters() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeFilter = btn.dataset.filter;
        this._applyFilter();
      });
    });
  }

  _applyFilter() {
    this.entries.forEach(e => {
      if (this.activeFilter === 'all') {
        e.el.classList.remove('hidden');
      } else {
        e.el.classList.toggle('hidden', e.type !== this.activeFilter);
      }
    });
  }

  _initClear() {
    document.getElementById('btn-clear-log').addEventListener('click', () => {
      this.el.innerHTML = '';
      this.entries = [];
      this.log('Log cleared.', 'sys');
    });
  }
}


/* ──────────────── RADAR ENGINE ──────────────── */
class RadarEngine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.dpr = window.devicePixelRatio || 1;
    this.angle = 0;
    this.blips = [];
    this.running = false;
    this.scanSpeed = 0.015; // radians per frame
    this._resize();
    window.addEventListener('resize', () => this._resize());
  }

  _resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const size = Math.min(rect.width, rect.height, 440);
    this.canvas.width = size * this.dpr;
    this.canvas.height = size * this.dpr;
    this.canvas.style.width = size + 'px';
    this.canvas.style.height = size + 'px';
    this.cx = this.canvas.width / 2;
    this.cy = this.canvas.height / 2;
    this.maxR = this.cx * 0.88;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this._loop();
  }

  stop() {
    this.running = false;
  }

  addBlip(portalIndex, status = 'found') {
    const angle = (portalIndex / PORTALS.length) * Math.PI * 2 - Math.PI / 2;
    const distance = 0.5 + Math.random() * 0.35;
    this.blips.push({
      angle,
      distance,
      status,
      born: Date.now(),
      life: status === 'found' ? 8000 : 3000,
      pulsePhase: 0
    });
  }

  _loop() {
    if (!this.running) return;
    this._render();
    requestAnimationFrame(() => this._loop());
  }

  _render() {
    const ctx = this.ctx;
    const { cx, cy, maxR, dpr } = this;

    // Clear
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Background glow
    const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * 1.1);
    bgGrad.addColorStop(0, 'rgba(0, 245, 255, 0.03)');
    bgGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Range rings
    ctx.strokeStyle = 'rgba(0, 245, 255, 0.08)';
    ctx.lineWidth = 1 * dpr;
    for (let i = 1; i <= 4; i++) {
      ctx.beginPath();
      ctx.arc(cx, cy, maxR * (i / 4), 0, Math.PI * 2);
      ctx.stroke();
    }

    // Cross hairs
    ctx.strokeStyle = 'rgba(0, 245, 255, 0.05)';
    ctx.beginPath();
    ctx.moveTo(cx - maxR, cy);
    ctx.lineTo(cx + maxR, cy);
    ctx.moveTo(cx, cy - maxR);
    ctx.lineTo(cx, cy + maxR);
    ctx.stroke();

    // Portal labels around edge
    ctx.font = `${10 * dpr}px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    PORTALS.forEach((p, i) => {
      const a = (i / PORTALS.length) * Math.PI * 2 - Math.PI / 2;
      const lx = cx + Math.cos(a) * (maxR + 18 * dpr);
      const ly = cy + Math.sin(a) * (maxR + 18 * dpr);
      ctx.fillStyle = 'rgba(0, 245, 255, 0.3)';
      ctx.fillText(p.icon, lx, ly);
    });

    // Sweep line
    this.angle += this.scanSpeed;
    if (this.angle > Math.PI * 2) this.angle -= Math.PI * 2;

    // Sweep trail (cone gradient)
    const trailSpan = 0.6; // radians of trail
    for (let i = 0; i < 30; i++) {
      const t = i / 30;
      const a = this.angle - trailSpan * t;
      ctx.strokeStyle = `rgba(0, 245, 255, ${0.12 * (1 - t)})`;
      ctx.lineWidth = 2 * dpr;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * maxR, cy + Math.sin(a) * maxR);
      ctx.stroke();
    }

    // Main sweep line
    ctx.strokeStyle = 'rgba(0, 245, 255, 0.6)';
    ctx.lineWidth = 2 * dpr;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(this.angle) * maxR, cy + Math.sin(this.angle) * maxR);
    ctx.stroke();

    // Blips
    const now = Date.now();
    this.blips = this.blips.filter(b => now - b.born < b.life);
    this.blips.forEach(b => {
      const age = (now - b.born) / b.life;
      const alpha = age < 0.1 ? age / 0.1 : 1 - (age - 0.1) / 0.9;
      const bx = cx + Math.cos(b.angle) * (maxR * b.distance);
      const by = cy + Math.sin(b.angle) * (maxR * b.distance);
      const color = b.status === 'found' ? [0, 255, 136] : b.status === 'checking' ? [255, 159, 67] : [255, 51, 102];
      const r = (4 + Math.sin(b.pulsePhase) * 2) * dpr;
      b.pulsePhase += 0.1;

      // Glow
      const glow = ctx.createRadialGradient(bx, by, 0, bx, by, r * 4);
      glow.addColorStop(0, `rgba(${color.join(',')}, ${0.3 * alpha})`);
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.fillRect(bx - r * 4, by - r * 4, r * 8, r * 8);

      // Dot
      ctx.fillStyle = `rgba(${color.join(',')}, ${alpha})`;
      ctx.beginPath();
      ctx.arc(bx, by, r, 0, Math.PI * 2);
      ctx.fill();
    });

    // Center dot
    const centerPulse = 3 + Math.sin(Date.now() / 400) * 1.5;
    const centerGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, centerPulse * 3 * dpr);
    centerGlow.addColorStop(0, 'rgba(0, 245, 255, 0.6)');
    centerGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = centerGlow;
    ctx.beginPath();
    ctx.arc(cx, cy, centerPulse * 3 * dpr, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#00f5ff';
    ctx.beginPath();
    ctx.arc(cx, cy, centerPulse * dpr, 0, Math.PI * 2);
    ctx.fill();
  }
}


/* ──────────────── NOTIFICATION MANAGER ──────────────── */
class NotificationManager {
  constructor() {
    this.audioCtx = null;
    this.alarmOsc = null;
    this.alarmGain = null;
    this.isPlaying = false;
  }

  async requestPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  }

  notify(title, body) {
    if ('Notification' in window && Notification.permission === 'granted') {
      const n = new Notification(title, {
        body,
        icon: '🎯',
        badge: '🎯',
        tag: 'slot-radar',
        requireInteraction: true
      });
      setTimeout(() => n.close(), 15000);
    }
  }

  playAlarm() {
    if (this.isPlaying) return;
    this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    this.isPlaying = true;
    this._alarmSequence();
  }

  _alarmSequence() {
    if (!this.isPlaying) return;
    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    // Urgent two-tone siren
    const frequencies = [880, 1100, 880, 1100, 660, 880];
    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.15);
      gain.gain.setValueAtTime(0.12, now + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.14);

      osc.start(now + i * 0.15);
      osc.stop(now + i * 0.15 + 0.15);
    });

    // Repeat
    setTimeout(() => this._alarmSequence(), 1500);
  }

  stopAlarm() {
    this.isPlaying = false;
    if (this.audioCtx) {
      this.audioCtx.close();
      this.audioCtx = null;
    }
  }

  playSuccess() {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.15);
      gain.gain.setValueAtTime(0.1, ctx.currentTime + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.3);
      osc.start(ctx.currentTime + i * 0.15);
      osc.stop(ctx.currentTime + i * 0.15 + 0.35);
    });
    setTimeout(() => ctx.close(), 2000);
  }
}


/* ──────────────── TRAVELLER PROFILE MANAGER ──────────────── */
class TravellerProfileManager {
  constructor() {
    this.profiles = [];
    this.listEl = document.getElementById('profiles-list');
    this._load();
    this.render();
    this._initModal();
  }

  _load() {
    try {
      const saved = localStorage.getItem('slotRadar_profiles');
      if (saved) this.profiles = JSON.parse(saved);
    } catch (e) { /* ignore */ }

    // Add defaults if empty
    if (this.profiles.length === 0) {
      this.profiles = [
        { id: 'p1', name: 'Rahul Sharma', passport: 'M7234561', dob: '1995-03-15', email: 'rahul.sharma@email.com', phone: '+91 98765 43210', nationality: 'Indian' },
        { id: 'p2', name: 'Priya Patel', passport: 'N8901234', dob: '1998-07-22', email: 'priya.patel@email.com', phone: '+91 87654 32109', nationality: 'Indian' }
      ];
      this._save();
    }
  }

  _save() {
    localStorage.setItem('slotRadar_profiles', JSON.stringify(this.profiles));
  }

  add(profile) {
    profile.id = 'p_' + Date.now();
    this.profiles.push(profile);
    this._save();
    this.render();
  }

  remove(id) {
    this.profiles = this.profiles.filter(p => p.id !== id);
    this._save();
    this.render();
  }

  getActive() {
    return this.profiles[0] || null;
  }

  render() {
    if (this.profiles.length === 0) {
      this.listEl.innerHTML = `
        <div class="profiles-empty">
          <div class="profiles-empty-icon">👤</div>
          <div>No traveller profiles yet. Add one to enable auto-fill.</div>
        </div>
      `;
      return;
    }

    const avatarColors = ['#00f5ff', '#7b61ff', '#00ff88', '#ff9f43', '#ff3366', '#3b82f6'];
    this.listEl.innerHTML = this.profiles.map((p, i) => `
      <div class="profile-card" data-id="${p.id}">
        <div class="profile-avatar" style="background:${avatarColors[i % avatarColors.length]}">
          ${p.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
        </div>
        <div class="profile-info">
          <div class="profile-name">${p.name}</div>
          <div class="profile-detail">${p.passport} · ${p.nationality}</div>
        </div>
        <button class="profile-delete" data-id="${p.id}" title="Remove profile">✕</button>
      </div>
    `).join('');

    // Delete handlers
    this.listEl.querySelectorAll('.profile-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.remove(btn.dataset.id);
      });
    });
  }

  _initModal() {
    const overlay = document.getElementById('modal-profile');
    const form = document.getElementById('profile-form');
    const btnOpen = document.getElementById('btn-add-profile');
    const btnCancel = document.getElementById('btn-cancel-profile');

    btnOpen.addEventListener('click', () => overlay.classList.add('open'));
    btnCancel.addEventListener('click', () => {
      overlay.classList.remove('open');
      form.reset();
    });
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) { overlay.classList.remove('open'); form.reset(); }
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.add({
        name: document.getElementById('pf-name').value,
        passport: document.getElementById('pf-passport').value,
        dob: document.getElementById('pf-dob').value,
        email: document.getElementById('pf-email').value,
        phone: document.getElementById('pf-phone').value,
        nationality: document.getElementById('pf-nationality').value
      });
      overlay.classList.remove('open');
      form.reset();
      if (window.app) window.app.logger.log(`Profile added: ${document.getElementById('pf-name').value}`, 'success');
    });
  }
}


/* ──────────────── AUTO-FILL ENGINE ──────────────── */
class AutoFillEngine {
  constructor() {
    this.humanForm = document.getElementById('human-form');
    this.agentForm = document.getElementById('agent-form');
    this.humanTimer = document.getElementById('human-timer');
    this.agentTimer = document.getElementById('agent-timer');
    this.speedResult = document.getElementById('speed-result');
    this.speedX = document.getElementById('speed-x');
    this.isRunning = false;
    this._initForms();
  }

  _initForms() {
    [this.humanForm, this.agentForm].forEach(form => {
      form.innerHTML = DEMO_FIELDS.map(f => `
        <div class="demo-field" data-label="${f.label}">
          <span class="demo-field-label">${f.label}</span>
          <span class="demo-field-value"></span>
        </div>
      `).join('');
    });
  }

  async runDemo() {
    if (this.isRunning) return;
    this.isRunning = true;

    // Reset
    this._initForms();
    this.humanTimer.textContent = '0.00s';
    this.agentTimer.textContent = '0.00s';
    this.speedResult.classList.remove('visible');

    const profile = window.app?.profileManager?.getActive();
    const values = profile
      ? [profile.name, profile.passport, profile.dob, profile.email, profile.phone, profile.nationality]
      : DEMO_FIELDS.map(f => f.value);

    // Run agent fill (fast)
    const agentStart = performance.now();
    await this._fillForm(this.agentForm, values, 8, this.agentTimer, agentStart);
    const agentTime = performance.now() - agentStart;

    // Run human fill (slow) simultaneously-appearing
    const humanStart = performance.now();
    await this._fillForm(this.humanForm, values, 55, this.humanTimer, humanStart);
    const humanTime = performance.now() - humanStart;

    // Show result
    const multiplier = Math.round(humanTime / agentTime);
    this.speedX.textContent = `${multiplier}x`;
    this.speedResult.classList.add('visible');

    this.isRunning = false;
  }

  async _fillForm(formEl, values, charDelay, timerEl, startTime) {
    const fields = formEl.querySelectorAll('.demo-field');
    for (let i = 0; i < fields.length; i++) {
      const field = fields[i];
      const valueEl = field.querySelector('.demo-field-value');
      const val = values[i] || DEMO_FIELDS[i].value;

      // Type each character
      for (let j = 0; j <= val.length; j++) {
        valueEl.innerHTML = val.slice(0, j) + '<span class="cursor"></span>';
        timerEl.textContent = ((performance.now() - startTime) / 1000).toFixed(2) + 's';
        await this._delay(charDelay);
      }

      // Mark done
      valueEl.textContent = val;
      field.classList.add('filled');
    }
  }

  _delay(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
}


/* ──────────────── MONITORING AGENT ──────────────── */
class MonitoringAgent {
  constructor(logger, radar) {
    this.logger = logger;
    this.radar = radar;
    this.running = false;
    this.portalStates = {};
    this.timers = {};
    this.scanCount = 0;
    this.slotsFound = 0;
    this.autoFills = 0;
    this.scanCountEl = document.getElementById('scan-count');
    this.onSlotFound = null; // callback

    PORTALS.forEach(p => {
      this.portalStates[p.id] = {
        status: 'idle',
        lastChecked: null,
        countdown: p.interval
      };
    });
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.logger.log('🚀 Monitoring agent activated. Scanning all portals...', 'info');

    PORTALS.forEach((portal, idx) => {
      // Stagger initial checks
      setTimeout(() => {
        if (!this.running) return;
        this._checkPortal(portal, idx);
        this.timers[portal.id] = setInterval(() => {
          if (!this.running) return;
          this._checkPortal(portal, idx);
        }, portal.interval * 1000);
      }, idx * 1500);
    });
  }

  stop() {
    this.running = false;
    Object.values(this.timers).forEach(t => clearInterval(t));
    this.timers = {};
    PORTALS.forEach(p => {
      this.portalStates[p.id].status = 'idle';
    });
    this._renderPortals();
    this.logger.log('⏹ Monitoring stopped.', 'info');
  }

  _checkPortal(portal, idx) {
    if (!this.running) return;
    const state = this.portalStates[portal.id];

    // Set scanning
    state.status = 'scanning';
    this._renderPortals();
    this.logger.log(`Scanning ${portal.icon} ${portal.name}...`, 'info');

    // Simulate check delay
    const checkDuration = 800 + Math.random() * 1200;
    setTimeout(() => {
      if (!this.running) return;

      this.scanCount++;
      this.scanCountEl.textContent = `Scans: ${this.scanCount}`;
      state.lastChecked = new Date();
      state.countdown = portal.interval;

      // Slot detection logic: increases probability over time
      const baseProbability = 0.04;
      const timeBonus = Math.min(this.scanCount * 0.008, 0.4);
      const found = Math.random() < (baseProbability + timeBonus);

      if (found && this.running) {
        state.status = 'found';
        this.slotsFound++;
        this.radar.addBlip(idx, 'found');
        this.logger.log(`🎯 SLOT DETECTED on ${portal.icon} ${portal.name}!`, 'alert');
        this._renderPortals();
        this._updateStats();

        if (this.onSlotFound) {
          this.onSlotFound(portal, idx);
        }
      } else {
        state.status = 'no-slots';
        this.radar.addBlip(idx, 'none');
        this.logger.log(`No slots on ${portal.icon} ${portal.name}. Next check in ${portal.interval}s.`, 'info');
        this._renderPortals();

        // Reset status after a moment
        setTimeout(() => {
          if (state.status === 'no-slots') {
            state.status = 'queued';
            this._renderPortals();
          }
        }, 2000);
      }
    }, checkDuration);

    // Countdown
    this._startCountdown(portal.id, portal.interval);
  }

  _startCountdown(portalId, seconds) {
    const state = this.portalStates[portalId];
    state.countdown = seconds;
    // Countdown handled in render loop
  }

  _updateStats() {
    document.getElementById('stat-monitors').textContent = PORTALS.filter(p => this.portalStates[p.id].status !== 'idle').length;
    document.getElementById('stat-slots').textContent = this.slotsFound;
    document.getElementById('stat-fills').textContent = this.autoFills;
    document.getElementById('stat-rate').textContent = this.slotsFound > 0
      ? Math.round((this.autoFills / Math.max(this.slotsFound, 1)) * 100) + '%'
      : '—';
  }

  _renderPortals() {
    const grid = document.getElementById('portal-grid');
    grid.innerHTML = PORTALS.map((p, i) => {
      const state = this.portalStates[p.id];
      const statusClass = state.status;
      const checked = state.lastChecked
        ? state.lastChecked.toTimeString().slice(0, 8)
        : '—';

      return `
        <div class="portal-card ${statusClass}" data-portal="${p.id}">
          <div class="portal-name">${p.icon} ${p.name}</div>
          <div class="portal-type">${p.type}</div>
          <div class="portal-meta">
            <div class="portal-meta-row">
              <span class="meta-label">Status</span>
              <span class="portal-status ${statusClass}">${this._statusLabel(state.status)}</span>
            </div>
            <div class="portal-meta-row">
              <span class="meta-label">Last Check</span>
              <span class="meta-value">${checked}</span>
            </div>
            <div class="portal-meta-row">
              <span class="meta-label">Interval</span>
              <span class="meta-value">${p.interval}s</span>
            </div>
            <div class="portal-meta-row">
              <span class="meta-label">Location</span>
              <span class="meta-value">${p.location}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  _statusLabel(status) {
    const labels = {
      idle: '● Idle',
      scanning: '◌ Scanning…',
      found: '★ Slot Found!',
      'no-slots': '✕ No Slots',
      queued: '◷ Queued'
    };
    return labels[status] || status;
  }
}


/* ──────────────── SLOT RADAR APP (ORCHESTRATOR) ──────────────── */
class SlotRadarApp {
  constructor() {
    this.logger = new ActivityLogger();
    this.radar = new RadarEngine('radar-canvas');
    this.notifier = new NotificationManager();
    this.profileManager = new TravellerProfileManager();
    this.autoFill = new AutoFillEngine();
    this.monitor = new MonitoringAgent(this.logger, this.radar);

    this.isMonitoring = false;
    this.otpCountdown = null;

    this._initControls();
    this._initParticles();
    this._renderInitialPortals();
    this.radar.start(); // Start radar animation (visual only)

    this.logger.log('All systems ready. Press "Start Monitoring" to begin.', 'sys');
  }

  _initControls() {
    // Start / Stop
    const btnStart = document.getElementById('btn-start');
    btnStart.addEventListener('click', () => {
      if (this.isMonitoring) {
        this.stopMonitoring();
      } else {
        this.startMonitoring();
      }
    });

    // Notification permission
    document.getElementById('btn-notification').addEventListener('click', () => {
      this.notifier.requestPermission();
      this.logger.log('Browser notification permission requested.', 'info');
    });

    // Auto-fill demo
    document.getElementById('btn-run-demo').addEventListener('click', () => {
      this.logger.log('Running auto-fill speed comparison demo...', 'info');
      this.autoFill.runDemo().then(() => {
        this.logger.log('Speed demo complete!', 'success');
      });
    });

    // Slot found modal
    document.getElementById('btn-proceed-fill').addEventListener('click', () => this._startAutoFill());
    document.getElementById('btn-dismiss-slot').addEventListener('click', () => this._dismissSlot());

    // OTP modal
    document.getElementById('btn-otp-done').addEventListener('click', () => this._completeOTP());

    // Success modal
    document.getElementById('btn-success-close').addEventListener('click', () => this._closeSuccess());

    // Monitor callback
    this.monitor.onSlotFound = (portal, idx) => this._handleSlotFound(portal, idx);
  }

  startMonitoring() {
    this.isMonitoring = true;
    this.monitor.start();
    this.radar.scanSpeed = 0.025;

    // UI updates
    const btn = document.getElementById('btn-start');
    btn.innerHTML = '<span class="btn-icon">⏹</span><span>Stop Monitoring</span>';
    btn.classList.remove('btn-primary');
    btn.classList.add('btn-danger');

    const dot = document.getElementById('status-dot');
    dot.className = 'status-dot scanning';
    document.getElementById('status-text').textContent = 'Scanning';

    document.getElementById('stat-monitors').textContent = PORTALS.length;
    this.logger.log('🟢 Monitoring started across all portals.', 'success');
  }

  stopMonitoring() {
    this.isMonitoring = false;
    this.monitor.stop();
    this.radar.scanSpeed = 0.015;

    const btn = document.getElementById('btn-start');
    btn.innerHTML = '<span class="btn-icon">▶</span><span>Start Monitoring</span>';
    btn.classList.remove('btn-danger');
    btn.classList.add('btn-primary');

    const dot = document.getElementById('status-dot');
    dot.className = 'status-dot';
    document.getElementById('status-text').textContent = 'Standby';

    document.getElementById('stat-monitors').textContent = '0';
  }

  _handleSlotFound(portal, idx) {
    // Pause monitoring for this slot
    this.monitor.stop();
    this.isMonitoring = false;
    this.radar.scanSpeed = 0.008;

    // Screen flash
    const flash = document.createElement('div');
    flash.className = 'screen-flash';
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 1200);

    // Update status
    const dot = document.getElementById('status-dot');
    dot.className = 'status-dot alert';
    document.getElementById('status-text').textContent = 'SLOT FOUND';

    // Play alarm
    this.notifier.playAlarm();
    this.notifier.notify('🎯 SLOT DETECTED!', `${portal.name} — ${portal.type}. Open Slot Radar now!`);

    // Pick scenario
    const scenario = SLOT_SCENARIOS.find(s => s.portal === portal.id) || SLOT_SCENARIOS[0];

    // Show modal
    document.getElementById('slot-portal-name').textContent = `${portal.icon} ${portal.name} — ${portal.type}`;
    document.getElementById('slot-date').textContent = scenario.date;
    document.getElementById('slot-time').textContent = scenario.time;
    document.getElementById('slot-location').textContent = scenario.location;
    document.getElementById('slot-category').textContent = scenario.category;

    // Countdown
    let count = 5;
    const countEl = document.getElementById('fill-countdown');
    countEl.textContent = count;
    this._slotCountdownTimer = setInterval(() => {
      count--;
      countEl.textContent = count;
      if (count <= 0) {
        clearInterval(this._slotCountdownTimer);
        this._startAutoFill();
      }
    }, 1000);

    document.getElementById('modal-slot').classList.add('open');
    this._currentScenario = scenario;
    this._currentPortal = portal;

    this.logger.log(`⚠️ URGENT: Slot found on ${portal.name}! Awaiting auto-fill...`, 'alert');
  }

  _dismissSlot() {
    clearInterval(this._slotCountdownTimer);
    this.notifier.stopAlarm();
    document.getElementById('modal-slot').classList.remove('open');

    const dot = document.getElementById('status-dot');
    dot.className = 'status-dot';
    document.getElementById('status-text').textContent = 'Standby';

    const btn = document.getElementById('btn-start');
    btn.innerHTML = '<span class="btn-icon">▶</span><span>Start Monitoring</span>';
    btn.classList.remove('btn-danger');
    btn.classList.add('btn-primary');

    this.logger.log('Slot dismissed. Monitoring stopped.', 'warn');
  }

  async _startAutoFill() {
    clearInterval(this._slotCountdownTimer);
    this.notifier.stopAlarm();
    document.getElementById('modal-slot').classList.remove('open');

    // Show filling modal
    document.getElementById('modal-filling').classList.add('open');
    this.logger.log('⚡ Auto-fill sequence initiated...', 'info');

    const dot = document.getElementById('status-dot');
    dot.className = 'status-dot active';
    document.getElementById('status-text').textContent = 'Auto-Filling';

    const profile = this.profileManager.getActive();
    const fields = [
      { label: 'Full Name', value: profile?.name || 'Rahul Sharma' },
      { label: 'Passport No.', value: profile?.passport || 'M7234561' },
      { label: 'Date of Birth', value: profile?.dob || '1995-03-15' },
      { label: 'Email Address', value: profile?.email || 'rahul.sharma@email.com' },
      { label: 'Phone Number', value: profile?.phone || '+91 98765 43210' },
      { label: 'Nationality', value: profile?.nationality || 'Indian' },
      { label: 'Appt Category', value: this._currentScenario?.category || 'Tourist Visa' },
      { label: 'Preferred Date', value: this._currentScenario?.date || '2026-09-12' }
    ];

    const container = document.getElementById('fill-fields');
    const bar = document.getElementById('fill-bar');
    const percent = document.getElementById('fill-percent');

    container.innerHTML = fields.map(f => `
      <div class="fill-field-row" data-label="${f.label}">
        <span class="fill-field-icon">○</span>
        <span class="fill-field-label">${f.label}</span>
        <span class="fill-field-value">—</span>
      </div>
    `).join('');

    // Fill each field with animation
    const rows = container.querySelectorAll('.fill-field-row');
    for (let i = 0; i < fields.length; i++) {
      const row = rows[i];
      const field = fields[i];

      row.classList.add('filling');
      row.querySelector('.fill-field-icon').textContent = '◌';
      this.logger.log(`Filling: ${field.label} → "${field.value}"`, 'info');

      await new Promise(r => setTimeout(r, 300 + Math.random() * 200));

      row.querySelector('.fill-field-value').textContent = field.value;
      row.querySelector('.fill-field-icon').textContent = '✓';
      row.classList.remove('filling');
      row.classList.add('done');

      const progress = ((i + 1) / fields.length) * 100;
      bar.style.width = progress + '%';
      percent.textContent = Math.round(progress) + '%';
    }

    this.monitor.autoFills++;
    this.monitor._updateStats();
    this.logger.log('✅ All fields auto-filled successfully!', 'success');

    await new Promise(r => setTimeout(r, 1000));

    // Transition to OTP modal
    document.getElementById('modal-filling').classList.remove('open');
    this._showOTPModal();
  }

  _showOTPModal() {
    document.getElementById('modal-otp').classList.add('open');

    const dot = document.getElementById('status-dot');
    dot.className = 'status-dot alert';
    document.getElementById('status-text').textContent = 'Awaiting Human';

    this.logger.log('🔐 PAUSED — Waiting for human OTP/payment verification.', 'alert');
    this.logger.log('The booking page is open. Complete the verification to proceed.', 'warn');

    // Notification
    this.notifier.notify('🔐 Action Required', 'Complete OTP verification and payment to confirm your booking.');

    // OTP countdown timer (5 minutes)
    let seconds = 300;
    const timerEl = document.getElementById('otp-timer');
    this.otpCountdown = setInterval(() => {
      seconds--;
      const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
      const secs = (seconds % 60).toString().padStart(2, '0');
      timerEl.textContent = `${mins}:${secs}`;
      if (seconds <= 0) {
        clearInterval(this.otpCountdown);
        timerEl.textContent = '00:00';
        this.logger.log('⏰ Slot hold timer expired.', 'alert');
      }
    }, 1000);
  }

  _completeOTP() {
    clearInterval(this.otpCountdown);
    document.getElementById('modal-otp').classList.remove('open');

    this.logger.log('🔓 Human verification completed!', 'success');
    this.logger.log('Processing final confirmation...', 'info');

    // Brief delay then success
    setTimeout(() => {
      this._showSuccess();
    }, 1500);
  }

  _showSuccess() {
    this.notifier.playSuccess();

    const dot = document.getElementById('status-dot');
    dot.className = 'status-dot active';
    document.getElementById('status-text').textContent = 'Confirmed';

    const portal = this._currentPortal || PORTALS[0];
    const scenario = this._currentScenario || SLOT_SCENARIOS[0];

    document.getElementById('success-summary').innerHTML = `
      <strong>Portal:</strong> ${portal.icon} ${portal.name}<br>
      <strong>Category:</strong> ${scenario.category}<br>
      <strong>Date:</strong> ${scenario.date} at ${scenario.time}<br>
      <strong>Location:</strong> ${scenario.location}<br>
      <strong>Status:</strong> <span style="color:var(--green);font-weight:700;">CONFIRMED ✓</span>
    `;

    document.getElementById('modal-success').classList.add('open');

    this.logger.log('🎉 BOOKING CONFIRMED! Workflow complete.', 'success');
    this.logger.log(`${portal.name} — ${scenario.category} on ${scenario.date} at ${scenario.time}`, 'success');
  }

  _closeSuccess() {
    document.getElementById('modal-success').classList.remove('open');

    const dot = document.getElementById('status-dot');
    dot.className = 'status-dot';
    document.getElementById('status-text').textContent = 'Standby';

    const btn = document.getElementById('btn-start');
    btn.innerHTML = '<span class="btn-icon">▶</span><span>Start Monitoring</span>';
    btn.classList.remove('btn-danger');
    btn.classList.add('btn-primary');

    this.logger.log('Ready to monitor again. Press Start.', 'sys');
    this._renderInitialPortals();
  }

  _renderInitialPortals() {
    const grid = document.getElementById('portal-grid');
    grid.innerHTML = PORTALS.map(p => `
      <div class="portal-card idle" data-portal="${p.id}">
        <div class="portal-name">${p.icon} ${p.name}</div>
        <div class="portal-type">${p.type}</div>
        <div class="portal-meta">
          <div class="portal-meta-row">
            <span class="meta-label">Status</span>
            <span class="portal-status idle">● Idle</span>
          </div>
          <div class="portal-meta-row">
            <span class="meta-label">Interval</span>
            <span class="meta-value">${p.interval}s</span>
          </div>
          <div class="portal-meta-row">
            <span class="meta-label">Location</span>
            <span class="meta-value">${p.location}</span>
          </div>
        </div>
      </div>
    `).join('');
  }

  _initParticles() {
    const container = document.getElementById('bg-particles');
    for (let i = 0; i < 30; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      p.style.left = Math.random() * 100 + '%';
      p.style.animationDuration = (12 + Math.random() * 20) + 's';
      p.style.animationDelay = (Math.random() * 15) + 's';
      p.style.width = (1 + Math.random() * 2) + 'px';
      p.style.height = p.style.width;
      container.appendChild(p);
    }
  }
}


/* ──────────────── INIT ──────────────── */
document.addEventListener('DOMContentLoaded', () => {
  window.app = new SlotRadarApp();
});
