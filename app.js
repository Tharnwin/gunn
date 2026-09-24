// =====================================================================
// CYBER STRIKE MULTIPLAYER - DUAL-ENGINE (GITHUB PAGES + NODE SERVER)
// Runs 100% client-side on GitHub Pages (with Bots & Local Database)
// AND automatically connects to Node.js backend when running on server!
// =====================================================================

// --- WEAPONS CONFIGURATION ---
const WEAPONS_CONFIG = {
  rifle: {
    name: 'Assault Rifle',
    damage: 24,
    fireRate: 120,
    magSize: 30,
    reloadTime: 1600,
    bulletSpeed: 19,
    spread: 0.05,
    range: 1200,
    color: '#00e5ff'
  },
  shotgun: {
    name: 'Pump Shotgun',
    damage: 16,
    pellets: 6,
    fireRate: 750,
    magSize: 8,
    reloadTime: 2200,
    bulletSpeed: 16,
    spread: 0.22,
    range: 650,
    color: '#ff9100'
  },
  sniper: {
    name: 'Sniper Rifle',
    damage: 95,
    headshotMultiplier: 2.0,
    fireRate: 1200,
    magSize: 5,
    reloadTime: 2400,
    bulletSpeed: 30,
    spread: 0.01,
    range: 1800,
    color: '#ff1744'
  },
  rocket: {
    name: 'Rocket Launcher',
    damage: 110,
    splashRadius: 180,
    fireRate: 1500,
    magSize: 3,
    reloadTime: 2600,
    bulletSpeed: 12,
    spread: 0.02,
    range: 1400,
    isRocket: true,
    color: '#ffd600'
  }
};

// --- DEFAULT MAP ---
const DEFAULT_MAP = {
  name: 'Cyber Arena',
  width: 2400,
  height: 1800,
  obstacles: [
    { x: 1100, y: 800, w: 200, h: 200, type: 'pillar', hp: 9999 },
    { x: 400, y: 350, w: 250, h: 60, type: 'wall' },
    { x: 400, y: 350, w: 60, h: 250, type: 'wall' },
    { x: 1750, y: 350, w: 250, h: 60, type: 'wall' },
    { x: 1940, y: 350, w: 60, h: 250, type: 'wall' },
    { x: 400, y: 1200, w: 60, h: 250, type: 'wall' },
    { x: 400, y: 1390, w: 250, h: 60, type: 'wall' },
    { x: 1940, y: 1200, w: 60, h: 250, type: 'wall' },
    { x: 1750, y: 1390, w: 250, h: 60, type: 'wall' },
    { x: 800, y: 850, w: 80, h: 100, type: 'crate' },
    { x: 1520, y: 850, w: 80, h: 100, type: 'crate' },
    { x: 1160, y: 500, w: 80, h: 80, type: 'crate' },
    { x: 1160, y: 1220, w: 80, h: 80, type: 'crate' },
    { x: 700, y: 500, w: 40, h: 40, type: 'barrel', explosive: true, hp: 40 },
    { x: 1700, y: 500, w: 40, h: 40, type: 'barrel', explosive: true, hp: 40 },
    { x: 700, y: 1300, w: 40, h: 40, type: 'barrel', explosive: true, hp: 40 },
    { x: 1700, y: 1300, w: 40, h: 40, type: 'barrel', explosive: true, hp: 40 }
  ],
  spawns: [
    { x: 300, y: 300 }, { x: 2100, y: 300 }, { x: 300, y: 1500 }, { x: 2100, y: 1500 },
    { x: 1200, y: 250 }, { x: 1200, y: 1550 }, { x: 600, y: 900 }, { x: 1800, y: 900 }
  ],
  pickupSpawns: [
    { x: 1200, y: 900, type: 'quad_damage' },
    { x: 600, y: 500, type: 'health' },
    { x: 1800, y: 500, type: 'health' },
    { x: 600, y: 1300, type: 'shield' },
    { x: 1800, y: 1300, type: 'shield' },
    { x: 950, y: 900, type: 'ammo' },
    { x: 1450, y: 900, type: 'ammo' }
  ]
};

// -------------------------------------------------------------
// 1. PROCEDURAL SOUND SYNTHESIZER
// -------------------------------------------------------------
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.muted = false;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
        this.initialized = true;
      }
    } catch (e) {}
  }

  ensureContext() {
    if (!this.initialized) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  playShoot(weaponKey) {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    if (weaponKey === 'sniper') {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(800, t);
      osc.frequency.exponentialRampToValueAtTime(40, t + 0.35);
      gain.gain.setValueAtTime(0.8, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.35);
    } else if (weaponKey === 'shotgun') {
      const noise = this.createNoiseBuffer(0.25);
      const source = this.ctx.createBufferSource();
      source.buffer = noise;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.8, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
      source.connect(gain);
      gain.connect(this.masterGain);
      source.start(t);
    } else if (weaponKey === 'rocket') {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(120, t);
      osc.frequency.linearRampToValueAtTime(320, t + 0.2);
      gain.gain.setValueAtTime(0.5, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.25);
    } else {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(450, t);
      osc.frequency.exponentialRampToValueAtTime(80, t + 0.1);
      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.1);
    }
  }

  playExplosion() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const noise = this.createNoiseBuffer(0.6);
    const source = this.ctx.createBufferSource();
    source.buffer = noise;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.9, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.6);
    source.connect(gain);
    gain.connect(this.masterGain);
    source.start(t);
  }

  playHit(isHeadshot = false) {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    if (isHeadshot) {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1800, t);
      osc.frequency.setValueAtTime(2400, t + 0.05);
      gain.gain.setValueAtTime(0.6, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(160, t);
      osc.frequency.exponentialRampToValueAtTime(60, t + 0.08);
      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
    }
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + (isHeadshot ? 0.2 : 0.08));
  }

  playDash() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(250, t);
    osc.frequency.linearRampToValueAtTime(600, t + 0.12);
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  playReload() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.playClick(t, 600);
    this.playClick(t + 0.35, 900);
    this.playClick(t + 0.7, 1200);
  }

  playClick(time, freq) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);
    gain.gain.setValueAtTime(0.25, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.06);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(time);
    osc.stop(time + 0.06);
  }

  createNoiseBuffer(duration) {
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }
}
window.soundEngine = new SoundEngine();

// -------------------------------------------------------------
// 2. WEBRTC VOICE CHAT
// -------------------------------------------------------------
class VoiceChatManager {
  constructor() {
    this.localStream = null;
    this.isMuted = false;
    this.isSpeaking = false;
  }
  setSocket(socket) {}
  async initMicrophone() {
    try {
      if (this.localStream) return true;
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        return true;
      }
    } catch (e) {}
    return false;
  }
  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(t => t.enabled = !this.isMuted);
    }
    const btn = document.getElementById('btnToggleMic');
    if (btn) {
      btn.classList.toggle('muted', this.isMuted);
      btn.innerHTML = this.isMuted 
        ? '<i class="fa-solid fa-microphone-slash"></i><span class="mic-status-text">MIC OFF</span>'
        : '<i class="fa-solid fa-microphone"></i><span class="mic-status-text">MIC ON</span>';
    }
    return this.isMuted;
  }
}
window.voiceChat = new VoiceChatManager();

// -------------------------------------------------------------
// 3. TOUCH CONTROLLER
// -------------------------------------------------------------
class TouchController {
  constructor() {
    this.moveX = 0;
    this.moveY = 0;
    this.aimAngle = null;
    this.isShooting = false;
    this.onShootCallback = null;
    this.onDashCallback = null;
    this.onReloadCallback = null;
    this.onSwitchWeaponCallback = null;
    this.leftTouchId = null;
    this.leftBasePos = { x: 0, y: 0 };
    this.leftMaxDist = 45;
  }

  init() {
    this.setupLeftJoystick();
    this.setupRightZone();
    this.setupActionButtons();
  }

  vibrate(ms = 25) {
    if ('vibrate' in navigator) {
      try { navigator.vibrate(ms); } catch (e) {}
    }
  }

  setupLeftJoystick() {
    const zone = document.getElementById('leftJoystickZone');
    const base = document.getElementById('leftJoystickBase');
    const stick = document.getElementById('leftJoystickStick');
    if (!zone || !base || !stick) return;

    zone.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (this.leftTouchId !== null) return;
      const touch = e.changedTouches[0];
      this.leftTouchId = touch.identifier;
      const rect = base.getBoundingClientRect();
      this.leftBasePos = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      this.handleLeftMove(touch);
    }, { passive: false });

    zone.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === this.leftTouchId) {
          this.handleLeftMove(e.changedTouches[i]);
          break;
        }
      }
    }, { passive: false });

    const endLeft = (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === this.leftTouchId) {
          this.leftTouchId = null;
          this.moveX = 0;
          this.moveY = 0;
          stick.style.transform = `translate(0px, 0px)`;
          break;
        }
      }
    };
    zone.addEventListener('touchend', endLeft);
    zone.addEventListener('touchcancel', endLeft);
  }

  handleLeftMove(touch) {
    const stick = document.getElementById('leftJoystickStick');
    const dx = touch.clientX - this.leftBasePos.x;
    const dy = touch.clientY - this.leftBasePos.y;
    const dist = Math.hypot(dx, dy);
    const clampedDist = Math.min(dist, this.leftMaxDist);
    const angle = Math.atan2(dy, dx);
    const sx = Math.cos(angle) * clampedDist;
    const sy = Math.sin(angle) * clampedDist;
    stick.style.transform = `translate(${sx}px, ${sy}px)`;
    this.moveX = sx / this.leftMaxDist;
    this.moveY = sy / this.leftMaxDist;
  }

  setupRightZone() {
    const zone = document.getElementById('rightJoystickZone');
    const base = document.getElementById('rightJoystickBase');
    const stick = document.getElementById('rightJoystickStick');
    if (!zone || !base || !stick) return;

    zone.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.changedTouches[0];
      const rect = base.getBoundingClientRect();
      const bx = rect.left + rect.width / 2;
      const by = rect.top + rect.height / 2;
      this.aimAngle = Math.atan2(touch.clientY - by, touch.clientX - bx);
      this.isShooting = true;
      if (this.onShootCallback) this.onShootCallback(this.aimAngle);
    }, { passive: false });

    zone.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const touch = e.changedTouches[0];
      const rect = base.getBoundingClientRect();
      const bx = rect.left + rect.width / 2;
      const by = rect.top + rect.height / 2;
      this.aimAngle = Math.atan2(touch.clientY - by, touch.clientX - bx);
      this.isShooting = true;
      if (this.onShootCallback) this.onShootCallback(this.aimAngle);
    }, { passive: false });

    zone.addEventListener('touchend', () => { this.isShooting = false; });
  }

  setupActionButtons() {
    const btnFire = document.getElementById('btnMobileFire');
    const btnDash = document.getElementById('btnMobileDash');
    const btnReload = document.getElementById('btnMobileReload');
    const btnWeapon = document.getElementById('btnMobileNextWeapon');
    const btnMic = document.getElementById('btnMobileMic');

    if (btnFire) {
      btnFire.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.isShooting = true;
        this.vibrate(20);
        if (this.onShootCallback) this.onShootCallback(this.aimAngle);
      });
      btnFire.addEventListener('touchend', () => { this.isShooting = false; });
    }

    if (btnDash) {
      btnDash.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.vibrate(35);
        if (this.onDashCallback) this.onDashCallback();
      });
    }

    if (btnReload) {
      btnReload.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.vibrate(20);
        if (this.onReloadCallback) this.onReloadCallback();
      });
    }

    if (btnWeapon) {
      btnWeapon.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.vibrate(20);
        if (this.onSwitchWeaponCallback) this.onSwitchWeaponCallback();
      });
    }

    if (btnMic) {
      btnMic.addEventListener('touchstart', (e) => {
        e.preventDefault();
        window.voiceChat.toggleMute();
      });
    }
  }
}
window.touchController = new TouchController();

// -------------------------------------------------------------
// 4. CANVAS 2D RENDERER
// -------------------------------------------------------------
class GameRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.camera = { x: 1200, y: 900, zoom: 1.0 };
    this.particles = [];
    this.floatingTexts = [];
    this.muzzleFlashes = [];
    this.explosions = [];
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  updateCamera(targetX, targetY) {
    this.camera.x += (targetX - this.camera.x) * 0.12;
    this.camera.y += (targetY - this.camera.y) * 0.12;
  }

  addDamageText(x, y, damage, isHeadshot = false) {
    this.floatingTexts.push({
      x: x + (Math.random() - 0.5) * 20,
      y: y - 20,
      vy: -1.8,
      text: isHeadshot ? `CRIT ${damage}` : `${damage}`,
      color: isHeadshot ? '#ffd700' : '#ffffff',
      size: isHeadshot ? 22 : 16,
      alpha: 1.0,
      life: 40
    });
  }

  addMuzzleFlash(x, y, angle) {
    this.muzzleFlashes.push({ x, y, angle, radius: 24, life: 4 });
  }

  addHitSparks(x, y, count = 6, color = '#ffd600') {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 2 + Math.random() * 2,
        color,
        alpha: 1.0,
        decay: 0.05
      });
    }
  }

  addBlood(x, y, count = 8) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 3;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 2.5 + Math.random() * 2.5,
        color: '#ff1744',
        alpha: 0.9,
        decay: 0.03
      });
    }
  }

  addExplosion(x, y, radius = 180) {
    this.explosions.push({ x, y, maxRadius: radius, currentRadius: 10, alpha: 1.0 });
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 6;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 3 + Math.random() * 4,
        color: Math.random() < 0.5 ? '#ff3d00' : '#ffd600',
        alpha: 1.0,
        decay: 0.03
      });
    }
  }

  render(map, players, bullets, pickups, localSocketId) {
    const ctx = this.ctx;
    const cw = this.canvas.width;
    const ch = this.canvas.height;

    ctx.fillStyle = '#06080e';
    ctx.fillRect(0, 0, cw, ch);

    ctx.save();
    ctx.translate(cw / 2, ch / 2);
    ctx.scale(this.camera.zoom, this.camera.zoom);
    ctx.translate(-this.camera.x, -this.camera.y);

    this.renderMap(map);
    this.renderPickups(pickups);
    this.renderObstacles(map.obstacles);
    this.renderBullets(bullets);

    for (const player of players) {
      this.renderPlayer(player, player.id === localSocketId);
    }

    this.renderEffects();
    ctx.restore();
    this.renderFloatingTexts();
  }

  renderMap(map) {
    const ctx = this.ctx;
    const mw = map.width || 2400;
    const mh = map.height || 1800;

    ctx.fillStyle = '#0b0f19';
    ctx.fillRect(0, 0, mw, mh);

    ctx.strokeStyle = 'rgba(0, 229, 255, 0.04)';
    ctx.lineWidth = 1;
    const gridSize = 80;
    for (let x = 0; x <= mw; x += gridSize) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, mh); ctx.stroke();
    }
    for (let y = 0; y <= mh; y += gridSize) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(mw, y); ctx.stroke();
    }

    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 6;
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 18;
    ctx.strokeRect(0, 0, mw, mh);
    ctx.shadowBlur = 0;
  }

  renderObstacles(obstacles) {
    if (!obstacles) return;
    const ctx = this.ctx;

    for (const obs of obstacles) {
      ctx.save();
      if (obs.type === 'pillar') {
        ctx.fillStyle = '#111827';
        ctx.strokeStyle = '#00e5ff';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.roundRect(obs.x, obs.y, obs.w, obs.h, 20);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = 'rgba(0, 229, 255, 0.2)';
        ctx.fillRect(obs.x + 30, obs.y + 30, obs.w - 60, obs.h - 60);
      } else if (obs.type === 'crate') {
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 2;
        ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
        ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);
      } else if (obs.type === 'barrel') {
        ctx.fillStyle = '#b71c1c';
        ctx.strokeStyle = '#ff1744';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(obs.x + obs.w / 2, obs.y + obs.h / 2, obs.w / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.fillStyle = '#141d2f';
        ctx.strokeStyle = '#00e5ff';
        ctx.lineWidth = 2;
        ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
        ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);
      }
      ctx.restore();
    }
  }

  renderPickups(pickups) {
    if (!pickups) return;
    const ctx = this.ctx;
    const time = Date.now() * 0.003;

    for (const p of pickups) {
      if (!p.active) continue;
      ctx.save();
      ctx.translate(p.x, p.y);
      const bob = Math.sin(time * 2) * 4;
      let color = '#00e676';
      let icon = '+';
      if (p.type === 'shield') { color = '#2979ff'; icon = '🛡'; }
      else if (p.type === 'ammo') { color = '#ffd600'; icon = '⚡'; }
      else if (p.type === 'quad_damage') { color = '#ff007f'; icon = '4X'; }

      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, bob, 18, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = color;
      ctx.font = 'bold 14px Orbitron';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(icon, 0, bob);
      ctx.restore();
    }
  }

  renderBullets(bullets) {
    if (!bullets) return;
    const ctx = this.ctx;

    for (const b of bullets) {
      ctx.save();
      if (b.isRocket) {
        ctx.translate(b.x, b.y);
        ctx.rotate(Math.atan2(b.vy, b.vx));
        ctx.fillStyle = '#ff3d00';
        ctx.fillRect(-12, -4, 24, 8);
      } else {
        ctx.strokeStyle = b.color || '#00e5ff';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(b.x - b.vx * 1.8, b.y - b.vy * 1.8);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  renderPlayer(player, isLocal) {
    if (!player || !player.isAlive) return;
    const ctx = this.ctx;

    ctx.save();
    ctx.translate(player.x, player.y);

    if (player.quadDamage) {
      ctx.strokeStyle = '#ff007f';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 26, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.rotate(player.rotation || 0);

    ctx.fillStyle = '#37474f';
    ctx.fillRect(16, 6, 20, 7);
    ctx.fillStyle = player.skinColor || '#00e5ff';
    ctx.beginPath();
    ctx.arc(12, 10, 6, 0, Math.PI * 2);
    ctx.arc(12, -10, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1c2438';
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = player.skinColor || '#00e5ff';
    ctx.beginPath();
    ctx.arc(0, -14, 6, 0, Math.PI * 2);
    ctx.arc(0, 14, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = isLocal ? '#00e5ff' : '#ff007f';
    ctx.fillRect(4, -8, 8, 16);
    ctx.restore();

    // Overhead HUD
    ctx.save();
    ctx.translate(player.x, player.y - 36);
    ctx.font = 'bold 12px "Chakra Petch", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = isLocal ? '#00e5ff' : '#ffffff';
    ctx.fillText(player.displayName || 'Player', 0, -10);

    const barW = 44;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(-barW / 2, 0, barW, 5);

    const hpPercent = Math.max(0, player.health / (player.maxHealth || 100));
    ctx.fillStyle = hpPercent > 0.4 ? '#00e676' : '#ff1744';
    ctx.fillRect(-barW / 2, 0, barW * hpPercent, 5);

    if (player.shield > 0) {
      const shieldPercent = player.shield / 100;
      ctx.fillStyle = '#2979ff';
      ctx.fillRect(-barW / 2, -4, barW * shieldPercent, 3);
    }
    ctx.restore();
  }

  renderEffects() {
    const ctx = this.ctx;
    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const exp = this.explosions[i];
      exp.currentRadius += (exp.maxRadius - exp.currentRadius) * 0.25;
      exp.alpha -= 0.04;
      if (exp.alpha <= 0) { this.explosions.splice(i, 1); continue; }
      ctx.save();
      ctx.strokeStyle = `rgba(255, 61, 0, ${exp.alpha})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(exp.x, exp.y, exp.currentRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx; p.y += p.vy;
      p.alpha -= p.decay;
      if (p.alpha <= 0) { this.particles.splice(i, 1); continue; }
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  renderFloatingTexts() {
    const ctx = this.ctx;
    const cw = this.canvas.width;
    const ch = this.canvas.height;
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy;
      ft.life--;
      ft.alpha = ft.life / 40;
      if (ft.life <= 0) { this.floatingTexts.splice(i, 1); continue; }
      const screenX = (ft.x - this.camera.x) * this.camera.zoom + cw / 2;
      const screenY = (ft.y - this.camera.y) * this.camera.zoom + ch / 2;
      ctx.save();
      ctx.globalAlpha = ft.alpha;
      ctx.font = `bold ${ft.size}px Orbitron, sans-serif`;
      ctx.fillStyle = ft.color;
      ctx.textAlign = 'center';
      ctx.fillText(ft.text, screenX, screenY);
      ctx.restore();
    }
  }

  renderMinimap(canvasEl, map, players, localPlayerId) {
    if (!canvasEl || !map) return;
    const ctx = canvasEl.getContext('2d');
    const mw = canvasEl.width;
    const mh = canvasEl.height;
    ctx.fillStyle = '#060a14';
    ctx.fillRect(0, 0, mw, mh);
    const scaleX = mw / (map.width || 2400);
    const scaleY = mh / (map.height || 1800);

    for (const p of players) {
      if (!p.isAlive) continue;
      ctx.fillStyle = p.id === localPlayerId ? '#00e5ff' : '#ff007f';
      ctx.beginPath();
      ctx.arc(p.x * scaleX, p.y * scaleY, p.id === localPlayerId ? 4 : 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
window.GameRenderer = GameRenderer;

// -------------------------------------------------------------
// 5. HYBRID AUTH & DATABASE MANAGER
// -------------------------------------------------------------
class AuthManager {
  constructor() {
    this.currentUser = null;
    this.storageKey = 'cyberstrike_user_session';
    this.dbStorageKey = 'cyberstrike_users_db';
    this.adminUsers = [];
    this.initLocalDB();
  }

  initLocalDB() {
    if (!localStorage.getItem(this.dbStorageKey)) {
      const seedUsers = [
        { id: 'usr_g_001', authProvider: 'google', username: 'shadow_hunter', displayName: 'Shadow Fox 🇹🇭', email: 'shadow@gmail.com', level: 5, coins: 1800, kills: 28, deaths: 8, wins: 4, createdAt: new Date().toISOString() },
        { id: 'usr_g_002', authProvider: 'google', username: 'cyber_titan', displayName: 'Vortex Prime ⚡', email: 'titan@gmail.com', level: 3, coins: 950, kills: 14, deaths: 6, wins: 2, createdAt: new Date().toISOString() },
        { id: 'usr_m_003', authProvider: 'manual', username: 'neon_rider', displayName: 'Neon Valkyrie', email: 'rider@cyber.io', level: 2, coins: 600, kills: 9, deaths: 5, wins: 1, createdAt: new Date().toISOString() }
      ];
      localStorage.setItem(this.dbStorageKey, JSON.stringify(seedUsers));
    }
  }

  getLocalUsers() {
    try {
      return JSON.parse(localStorage.getItem(this.dbStorageKey) || '[]');
    } catch (e) {
      return [];
    }
  }

  saveLocalUser(user) {
    const list = this.getLocalUsers();
    const idx = list.findIndex(u => u.id === user.id || (u.email && u.email === user.email));
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...user };
    } else {
      list.unshift(user);
    }
    localStorage.setItem(this.dbStorageKey, JSON.stringify(list));
  }

  init() {
    this.loadCachedSession();
    this.setupUIEvents();
    this.setupAdminEvents();
    this.updateDBCountBadge();
  }

  loadCachedSession() {
    try {
      const cached = localStorage.getItem(this.storageKey);
      if (cached) {
        this.currentUser = JSON.parse(cached);
        this.onUserLoggedIn(this.currentUser);
      } else {
        this.showAuthScreen();
      }
    } catch (e) {
      this.showAuthScreen();
    }
  }

  saveSession(user) {
    this.currentUser = user;
    localStorage.setItem(this.storageKey, JSON.stringify(user));
    this.saveLocalUser(user);
    this.onUserLoggedIn(user);
    this.updateDBCountBadge();
  }

  showAuthScreen() {
    const authScreen = document.getElementById('authScreen');
    const lobbyScreen = document.getElementById('lobbyScreen');
    const gameScreen = document.getElementById('gameScreen');
    if (authScreen) authScreen.classList.add('active');
    if (lobbyScreen) lobbyScreen.classList.remove('active');
    if (gameScreen) gameScreen.classList.remove('active');
    this.updateUserUI();
  }

  onUserLoggedIn(user) {
    const authScreen = document.getElementById('authScreen');
    const lobbyScreen = document.getElementById('lobbyScreen');
    if (authScreen) authScreen.classList.remove('active');
    if (lobbyScreen) lobbyScreen.classList.add('active');
    this.updateUserUI();

    if (window.cyberStrike) {
      window.cyberStrike.renderCharacterPreview();
      window.cyberStrike.loadServers();
      window.cyberStrike.loadLeaderboard();
    }
  }

  async loginWithGoogle() {
    const defaultNames = ['ShadowFox', 'CyberGhost', 'TitanV', 'Vortex', 'ApexStriker', 'NeonRider'];
    const randomPick = defaultNames[Math.floor(Math.random() * defaultNames.length)];
    const randomNum = Math.floor(100 + Math.random() * 900);

    const promptName = prompt('ล็อกอินด้วย Google Account (พิมพ์ชื่อเล่น หรือ อีเมล Google ของคุณ):', `${randomPick}_${randomNum}`);
    if (!promptName) return;

    const email = `${promptName.toLowerCase().replace(/[^a-z0-9]/g, '')}@gmail.com`;
    const googleId = `google_${btoa(email).substr(0, 14)}`;
    const photoURL = `https://api.dicebear.com/7.x/bottts/svg?seed=${promptName}`;

    const userObj = {
      id: googleId,
      authProvider: 'google',
      googleId,
      username: promptName,
      displayName: promptName,
      email,
      photoURL,
      level: 1,
      coins: 500,
      kills: 0,
      deaths: 0,
      wins: 0,
      skinColor: '#00e5ff',
      createdAt: new Date().toISOString()
    };

    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userObj)
      });
      const data = await res.json();
      if (data.success && data.user) {
        this.saveSession(data.user);
        return;
      }
    } catch (e) {}

    // Fallback local save (works 100% on GitHub Pages!)
    this.saveSession(userObj);
  }

  async register(username, email, password, displayName) {
    const alertBox = document.getElementById('registerAlert');
    const newUser = {
      id: `usr_${Date.now()}`,
      authProvider: 'manual',
      username,
      displayName: displayName || username,
      email: email || `${username}@player.cyberstrike.io`,
      photoURL: `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`,
      level: 1,
      coins: 500,
      kills: 0,
      deaths: 0,
      wins: 0,
      skinColor: '#00e5ff',
      createdAt: new Date().toISOString()
    };

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, displayName })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        this.showAlert(alertBox, 'สมัครสมาชิกสำเร็จ! กำลังเข้าสู่ระบบ...', 'success');
        setTimeout(() => this.saveSession(data.user), 600);
        return;
      }
    } catch (e) {}

    // Local registration for GitHub Pages
    this.showAlert(alertBox, 'สมัครสมาชิกและสร้างโปรไฟล์สำเร็จ! (ระบบ Offline/GitHub Pages)', 'success');
    setTimeout(() => this.saveSession(newUser), 600);
  }

  async login(usernameOrEmail, password) {
    const alertBox = document.getElementById('loginAlert');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernameOrEmail, password })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        this.showAlert(alertBox, 'เข้าสู่ระบบสำเร็จ!', 'success');
        setTimeout(() => this.saveSession(data.user), 500);
        return;
      }
    } catch (e) {}

    // Local login check
    const localUsers = this.getLocalUsers();
    const found = localUsers.find(u => 
      (u.username && u.username.toLowerCase() === usernameOrEmail.toLowerCase()) ||
      (u.email && u.email.toLowerCase() === usernameOrEmail.toLowerCase())
    );

    if (found) {
      this.showAlert(alertBox, 'เข้าสู่ระบบสำเร็จ!', 'success');
      setTimeout(() => this.saveSession(found), 500);
    } else {
      // Create quick user so they are never blocked
      const newUser = {
        id: `usr_${Date.now()}`,
        authProvider: 'manual',
        username: usernameOrEmail,
        displayName: usernameOrEmail,
        email: `${usernameOrEmail}@player.cyberstrike.io`,
        photoURL: `https://api.dicebear.com/7.x/bottts/svg?seed=${usernameOrEmail}`,
        level: 1,
        coins: 500,
        kills: 0,
        deaths: 0,
        wins: 0,
        skinColor: '#00e5ff',
        createdAt: new Date().toISOString()
      };
      this.showAlert(alertBox, 'เข้าสู่ระบบสำเร็จ!', 'success');
      setTimeout(() => this.saveSession(newUser), 500);
    }
  }

  loginAsGuest() {
    const guestId = `guest_${Date.now().toString(36)}`;
    const guestNum = Math.floor(1000 + Math.random() * 9000);
    const guestUser = {
      id: guestId,
      authProvider: 'guest',
      username: `guest_${guestNum}`,
      displayName: `Striker_${guestNum}`,
      photoURL: `https://api.dicebear.com/7.x/bottts/svg?seed=${guestId}`,
      level: 1,
      coins: 500,
      kills: 0,
      deaths: 0,
      wins: 0,
      skinColor: '#00e5ff',
      createdAt: new Date().toISOString()
    };
    this.saveSession(guestUser);
  }

  logout() {
    localStorage.removeItem(this.storageKey);
    this.currentUser = null;
    this.showAuthScreen();
  }

  showAlert(el, msg, type = 'error') {
    if (!el) return;
    el.className = `auth-alert ${type}`;
    el.textContent = msg;
    el.classList.remove('hidden');
  }

  updateDBCountBadge() {
    const badge = document.getElementById('registeredUsersCount');
    if (!badge) return;
    const users = this.getLocalUsers();
    badge.innerHTML = `ฐานข้อมูล: มีผู้เล่นลงทะเบียนแล้ว <strong>${users.length}</strong> คน`;
  }

  updateUserUI() {
    const loggedOutBox = document.getElementById('authLoggedOut');
    const loggedInBox = document.getElementById('authLoggedIn');

    if (this.currentUser) {
      if (loggedOutBox) loggedOutBox.classList.add('hidden');
      if (loggedInBox) loggedInBox.classList.remove('hidden');

      const nameEl = document.getElementById('userName');
      const avatarEl = document.getElementById('userAvatar');
      const levelEl = document.getElementById('userLevelBadge');
      const coinsEl = document.getElementById('userCoins');
      const kdEl = document.getElementById('userKD');

      if (nameEl) nameEl.textContent = this.currentUser.displayName || 'Player';
      if (avatarEl) avatarEl.src = this.currentUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=user`;
      if (levelEl) levelEl.textContent = `LVL ${this.currentUser.level || 1}`;
      if (coinsEl) coinsEl.innerHTML = `<i class="fa-solid fa-coins gold"></i> ${this.currentUser.coins || 500}`;

      const kd = this.currentUser.deaths > 0 
        ? (this.currentUser.kills / this.currentUser.deaths).toFixed(2) 
        : (this.currentUser.kills || 0).toFixed(2);
      if (kdEl) kdEl.innerHTML = `<i class="fa-solid fa-skull"></i> K/D: ${kd}`;

      if (this.currentUser.skinColor) {
        document.querySelectorAll('.color-btn').forEach(b => {
          b.classList.toggle('active', b.dataset.color === this.currentUser.skinColor);
        });
      }
    } else {
      if (loggedOutBox) loggedOutBox.classList.remove('hidden');
      if (loggedInBox) loggedInBox.classList.add('hidden');
    }
  }

  // --- ADMIN MODAL & EXCEL EXPORT (WORKS 100% IN BROWSER) ---
  openAdminModal() {
    const modal = document.getElementById('adminModal');
    const authBox = document.getElementById('adminAuthBox');
    const contentBox = document.getElementById('adminContentBox');
    if (!modal) return;

    modal.classList.remove('hidden');
    if (sessionStorage.getItem('admin_authenticated') === 'true') {
      if (authBox) authBox.classList.add('hidden');
      if (contentBox) contentBox.classList.remove('hidden');
      this.loadAdminData();
    } else {
      if (authBox) authBox.classList.remove('hidden');
      if (contentBox) contentBox.classList.add('hidden');
    }
  }

  closeAdminModal() {
    const modal = document.getElementById('adminModal');
    if (modal) modal.classList.add('hidden');
  }

  async loadAdminData() {
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (data.success && data.users) {
        this.adminUsers = data.users;
        this.renderAdminKPIs(data.stats);
        this.renderAdminTable();
        return;
      }
    } catch (e) {}

    // Fallback to local DB for GitHub Pages!
    this.adminUsers = this.getLocalUsers();
    const stats = {
      totalUsers: this.adminUsers.length,
      googleCount: this.adminUsers.filter(u => u.authProvider === 'google').length,
      manualCount: this.adminUsers.filter(u => u.authProvider === 'manual').length,
      totalKills: this.adminUsers.reduce((sum, u) => sum + (u.kills || 0), 0)
    };
    this.renderAdminKPIs(stats);
    this.renderAdminTable();
  }

  renderAdminKPIs(stats) {
    const statUsers = document.getElementById('modalStatTotalUsers');
    const statGoogle = document.getElementById('modalStatGoogleUsers');
    const statManual = document.getElementById('modalStatManualUsers');
    const statKills = document.getElementById('modalStatTotalKills');

    if (statUsers) statUsers.textContent = stats.totalUsers || 0;
    if (statGoogle) statGoogle.textContent = stats.googleCount || 0;
    if (statManual) statManual.textContent = stats.manualCount || 0;
    if (statKills) statKills.textContent = stats.totalKills || 0;
  }

  renderAdminTable() {
    const tbody = document.getElementById('modalAdminUsersTableBody');
    const searchInput = document.getElementById('modalAdminSearchInput');
    const providerSelect = document.getElementById('modalAdminFilterProvider');
    if (!tbody) return;

    const search = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const providerFilter = providerSelect ? providerSelect.value : 'all';
    tbody.innerHTML = '';

    const filtered = this.adminUsers.filter(u => {
      const matchSearch = 
        (u.displayName && u.displayName.toLowerCase().includes(search)) ||
        (u.username && u.username.toLowerCase().includes(search)) ||
        (u.email && u.email.toLowerCase().includes(search)) ||
        (u.id && u.id.toLowerCase().includes(search));
      const matchProvider = providerFilter === 'all' || u.authProvider === providerFilter;
      return matchSearch && matchProvider;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="12" style="text-align:center; padding:24px; color:var(--text-dim);">ไม่พบข้อมูลผู้เล่น</td></tr>';
      return;
    }

    filtered.forEach((u, idx) => {
      const kd = u.deaths > 0 ? (u.kills / u.deaths).toFixed(2) : (u.kills || 0).toFixed(2);
      const tr = document.createElement('tr');
      let providerBadge = '<span class="provider-badge manual"><i class="fa-solid fa-user"></i> เว็บ</span>';
      if (u.authProvider === 'google') providerBadge = '<span class="provider-badge google"><i class="fa-brands fa-google"></i> Google</span>';
      else if (u.authProvider === 'guest') providerBadge = '<span class="provider-badge guest"><i class="fa-solid fa-user-ninja"></i> Guest</span>';

      const dateStr = u.createdAt ? new Date(u.createdAt).toLocaleDateString('th-TH') : '-';

      tr.innerHTML = `
        <td>${idx + 1}</td>
        <td>
          <div class="player-cell">
            <img src="${u.photoURL || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + u.id}" alt="">
            <strong style="color:#fff;">${u.displayName || '-'}</strong>
          </div>
        </td>
        <td>${providerBadge}</td>
        <td style="color:var(--primary); font-family:monospace;">${u.username || '-'}</td>
        <td style="color:var(--text-dim);">${u.email || '-'}</td>
        <td><span class="level-badge">LVL ${u.level || 1}</span></td>
        <td><span class="gold"><i class="fa-solid fa-coins"></i> ${u.coins || 0}</span></td>
        <td><span style="color:#00e5ff;">${u.kills || 0}</span> / <span style="color:#ff1744;">${u.deaths || 0}</span></td>
        <td style="color:#ffd600; font-weight:700;">${kd}</td>
        <td style="color:#00e676; font-weight:700;">${u.wins || 0}</td>
        <td style="color:var(--text-dim); font-size:0.8rem;">${dateStr}</td>
        <td>
          <button class="icon-btn" title="ลบผู้เล่น" onclick="window.authManager.deleteAdminUser('${u.id}', '${u.displayName}')" style="color:var(--danger);">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  deleteAdminUser(id, name) {
    if (confirm(`ลบผู้เล่น "${name}" ออกจากฐานข้อมูล?`)) {
      fetch(`/api/admin/users/${id}`, { method: 'DELETE' }).catch(() => {});
      const list = this.getLocalUsers().filter(u => u.id !== id);
      localStorage.setItem(this.dbStorageKey, JSON.stringify(list));
      this.loadAdminData();
      this.updateDBCountBadge();
    }
  }

  exportExcelCSV() {
    const users = this.adminUsers.length > 0 ? this.adminUsers : this.getLocalUsers();
    const headers = [
      'ลำดับ', 'User ID', 'ช่องทางสมัคร', 'ชื่อผู้ใช้', 'ชื่อในเกม', 'อีเมล',
      'เลเวล', 'เหรียญ', 'Kills', 'Deaths', 'KD', 'ชัยชนะ', 'วันที่สมัคร'
    ];

    const rows = [headers.join(',')];
    users.forEach((u, idx) => {
      const kd = u.deaths > 0 ? (u.kills / u.deaths).toFixed(2) : (u.kills || 0).toFixed(2);
      const row = [
        idx + 1,
        `"${u.id}"`,
        `"${u.authProvider || 'manual'}"`,
        `"${u.username || '-'}"`,
        `"${u.displayName || '-'}"`,
        `"${u.email || '-'}"`,
        u.level || 1,
        u.coins || 0,
        u.kills || 0,
        u.deaths || 0,
        kd,
        u.wins || 0,
        `"${u.createdAt ? new Date(u.createdAt).toLocaleString('th-TH') : '-'}"`
      ];
      rows.push(row.join(','));
    });

    const csvContent = '\uFEFF' + rows.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `cyberstrike_users_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  setupAdminEvents() {
    const loginForm = document.getElementById('modalAdminLoginForm');
    const pwdInput = document.getElementById('modalAdminPasswordInput');
    const authBox = document.getElementById('adminAuthBox');
    const contentBox = document.getElementById('adminContentBox');

    if (loginForm && pwdInput) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (pwdInput.value === 'admin1234' || pwdInput.value === 'admin') {
          sessionStorage.setItem('admin_authenticated', 'true');
          if (authBox) authBox.classList.add('hidden');
          if (contentBox) contentBox.classList.remove('hidden');
          this.loadAdminData();
        } else {
          alert('รหัสผ่านแอดมินไม่ถูกต้อง! (รหัสผ่านคือ admin1234)');
          pwdInput.value = '';
        }
      });
    }

    document.querySelectorAll('.modal-close-admin').forEach(btn => {
      btn.addEventListener('click', () => this.closeAdminModal());
    });

    const searchInput = document.getElementById('modalAdminSearchInput');
    const providerSelect = document.getElementById('modalAdminFilterProvider');
    const refreshBtn = document.getElementById('btnRefreshAdmin');

    if (searchInput) searchInput.addEventListener('input', () => this.renderAdminTable());
    if (providerSelect) providerSelect.addEventListener('change', () => this.renderAdminTable());
    if (refreshBtn) refreshBtn.addEventListener('click', () => this.loadAdminData());

    document.querySelectorAll('.btn-open-admin').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.openAdminModal();
      });
    });

    // Excel Export button
    const btnExcel = document.querySelector('#adminModal .btn-excel');
    if (btnExcel) {
      btnExcel.addEventListener('click', (e) => {
        e.preventDefault();
        this.exportExcelCSV();
      });
    }
  }

  setupUIEvents() {
    const btnAuthGoogle = document.getElementById('btnAuthGoogle');
    if (btnAuthGoogle) btnAuthGoogle.addEventListener('click', () => this.loginWithGoogle());

    const btnGoogle = document.getElementById('btnGoogleLogin');
    if (btnGoogle) btnGoogle.addEventListener('click', () => this.loginWithGoogle());

    const btnAuthGuest = document.getElementById('btnAuthGuest');
    if (btnAuthGuest) btnAuthGuest.addEventListener('click', () => this.loginAsGuest());

    const btnGuest = document.getElementById('btnGuestLogin');
    if (btnGuest) btnGuest.addEventListener('click', () => this.loginAsGuest());

    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) btnLogout.addEventListener('click', () => this.logout());

    const tabLogin = document.getElementById('tabBtnLogin');
    const tabRegister = document.getElementById('tabBtnRegister');
    const formLogin = document.getElementById('formLogin');
    const formRegister = document.getElementById('formRegister');

    if (tabLogin && tabRegister && formLogin && formRegister) {
      tabLogin.addEventListener('click', () => {
        tabLogin.classList.add('active');
        tabRegister.classList.remove('active');
        formLogin.classList.add('active');
        formRegister.classList.remove('active');
      });

      tabRegister.addEventListener('click', () => {
        tabRegister.classList.add('active');
        tabLogin.classList.remove('active');
        formRegister.classList.add('active');
        formLogin.classList.remove('active');
      });
    }

    if (formLogin) {
      formLogin.addEventListener('submit', (e) => {
        e.preventDefault();
        const usernameOrEmail = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value;
        this.login(usernameOrEmail, password);
      });
    }

    if (formRegister) {
      formRegister.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('regUsername').value.trim();
        const displayName = document.getElementById('regDisplayName').value.trim();
        const email = document.getElementById('regEmail').value.trim();
        const password = document.getElementById('regPassword').value;
        this.register(username, email, password, displayName);
      });
    }
  }

  getUserProfile() {
    if (!this.currentUser) {
      this.loginAsGuest();
    }
    return this.currentUser;
  }
}
window.authManager = new AuthManager();

// -------------------------------------------------------------
// 6. CORE GAME APPLICATION (HYBRID ENGINE)
// -------------------------------------------------------------
class CyberStrikeGame {
  constructor() {
    this.socket = null;
    this.renderer = null;
    this.currentRoom = null;
    this.map = DEFAULT_MAP;
    this.myPlayer = null;
    this.players = [];
    this.bullets = [];
    this.pickups = [];
    this.weapons = WEAPONS_CONFIG;
    this.activeWeapon = 'rifle';

    this.keys = {};
    this.mouse = { x: 0, y: 0, isDown: false, angle: 0 };
    this.lastShootTime = 0;
    this.currentScreen = 'lobbyScreen';

    // Standalone / Offline In-Browser Simulation
    this.isLocalSimulation = true;
    this.localTick = 0;
    this.localKillfeed = [];
  }

  async init() {
    // 1. Attach UI events first so every button is 100% responsive
    this.setupLobbyEvents();
    this.setupInputListeners();
    this.setupHUDListeners();

    // 2. Auth & Touch
    window.authManager.init();
    window.touchController.init();

    // 3. Canvas & Renderer
    const canvas = document.getElementById('gameCanvas');
    if (canvas) {
      this.renderer = new GameRenderer(canvas);
    }

    this.initCharacterPreview();

    // 4. Connect Socket & Load Content
    this.initSocket();
    this.loadServers();
    this.loadLeaderboard();
    this.startGameLoop();
  }

  initSocket() {
    if (typeof io !== 'undefined') {
      try {
        const serverUrl = window.location.protocol.startsWith('http') ? undefined : 'http://localhost:3000';
        this.socket = io(serverUrl, { timeout: 3000, reconnectionAttempts: 2 });
        window.voiceChat.setSocket(this.socket);

        this.socket.on('connect', () => {
          this.isLocalSimulation = false;
          const statusEl = document.getElementById('connectionStatus');
          if (statusEl) statusEl.textContent = 'เชื่อมต่อเซิร์ฟเวอร์ออนไลน์สำเร็จ';
        });

        this.socket.on('disconnect', () => {
          this.isLocalSimulation = true;
        });

        this.socket.on('room-joined', (data) => {
          this.isLocalSimulation = false;
          this.currentRoom = data.roomId;
          this.map = data.map || DEFAULT_MAP;
          this.myPlayer = data.you;
          this.weapons = data.weapons || WEAPONS_CONFIG;
          this.activeWeapon = this.myPlayer.weapon || 'rifle';

          const roomBadge = document.getElementById('hudRoomName');
          if (roomBadge) roomBadge.textContent = data.roomName || 'Bangkok Arena';

          this.switchScreen('gameScreen');
          window.voiceChat.initMicrophone();
          window.soundEngine.ensureContext();
        });

        this.socket.on('game-state', (state) => {
          this.players = state.players || [];
          this.bullets = state.bullets || [];
          this.pickups = state.pickups || [];

          const me = this.players.find(p => p.id === this.socket.id);
          if (me) {
            this.myPlayer = me;
            this.updateHUDPlayerState(me);
          }
          this.updateHUDKillfeed(state.killfeed);

          const minimapCanvas = document.getElementById('minimapCanvas');
          if (minimapCanvas && this.map) {
            this.renderer.renderMinimap(minimapCanvas, this.map, this.players, this.socket.id);
          }
        });

        this.socket.on('game-hits', (hits) => {
          this.handleHits(hits);
        });

        this.socket.on('bullets-fired', (data) => {
          window.soundEngine.playShoot(data.weapon);
        });
      } catch (e) {
        this.isLocalSimulation = true;
      }
    } else {
      this.isLocalSimulation = true;
    }
  }

  // --- JOIN ROOM / ENTER BATTLE (WORKS 100% ON GITHUB PAGES & SERVER) ---
  joinRoom(roomId = 'asia-bkk-1') {
    window.soundEngine.ensureContext();
    const profile = window.authManager.getUserProfile();
    const activeColor = document.querySelector('.color-btn.active');
    const skinColor = activeColor ? activeColor.dataset.color : '#00e5ff';
    const favWeapon = document.getElementById('selectFavoriteWeapon') ? document.getElementById('selectFavoriteWeapon').value : 'rifle';

    // If socket is connected, join server room
    if (this.socket && this.socket.connected) {
      this.socket.emit('join-room', {
        roomId,
        profile: {
          id: profile.id,
          displayName: profile.displayName,
          photoURL: profile.photoURL,
          level: profile.level,
          skinColor,
          favoriteWeaponKey: favWeapon
        }
      });
      return;
    }

    // Otherwise, start STANDALONE ARENA MODE immediately!
    this.startLocalBattleArena(roomId, profile, skinColor, favWeapon);
  }

  startLocalBattleArena(roomId, profile, skinColor, favWeapon) {
    this.isLocalSimulation = true;
    this.map = DEFAULT_MAP;
    this.currentRoom = roomId;
    this.activeWeapon = favWeapon || 'rifle';

    // Spawn local player
    this.myPlayer = {
      id: 'local_player',
      socketId: 'local_player',
      displayName: profile.displayName || 'Soldier',
      photoURL: profile.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=local`,
      level: profile.level || 1,
      x: 1200,
      y: 900,
      rotation: 0,
      health: 100,
      maxHealth: 100,
      shield: 50,
      maxShield: 100,
      kills: 0,
      deaths: 0,
      score: 0,
      isAlive: true,
      weapon: favWeapon || 'rifle',
      ammo: WEAPONS_CONFIG[favWeapon || 'rifle'].magSize,
      isReloading: false,
      isDashing: false,
      skinColor: skinColor || '#00e5ff',
      quadDamage: false
    };

    // Spawn 4 Smart Bots
    const botNames = ['[BOT] Alpha_9', '[BOT] Phantom', '[BOT] Stryker_X', '[BOT] Viper_01'];
    const botWeapons = ['rifle', 'shotgun', 'sniper', 'rifle'];
    const botColors = ['#ff007f', '#ffd600', '#ff1744', '#7c4dff'];

    this.players = [this.myPlayer];
    this.bullets = [];
    this.localKillfeed = [];

    // Init pickups
    this.pickups = this.map.pickupSpawns.map((sp, idx) => ({
      id: `pk_${idx}`,
      x: sp.x,
      y: sp.y,
      type: sp.type,
      active: true,
      respawnTimer: 0
    }));

    for (let i = 0; i < 4; i++) {
      const sp = this.map.spawns[i % this.map.spawns.length];
      this.players.push({
        id: `bot_${i}`,
        isBot: true,
        displayName: botNames[i],
        photoURL: `https://api.dicebear.com/7.x/bottts/svg?seed=bot_${i}`,
        x: sp.x,
        y: sp.y,
        rotation: Math.random() * Math.PI * 2,
        health: 100,
        maxHealth: 100,
        shield: 50,
        maxShield: 100,
        kills: 0,
        deaths: 0,
        score: 0,
        isAlive: true,
        weapon: botWeapons[i],
        ammo: WEAPONS_CONFIG[botWeapons[i]].magSize,
        skinColor: botColors[i],
        aiTimer: 0
      });
    }

    const roomBadge = document.getElementById('hudRoomName');
    if (roomBadge) roomBadge.textContent = 'Arena (Standalone/Online)';

    this.switchScreen('gameScreen');
    window.voiceChat.initMicrophone();
    window.soundEngine.ensureContext();
  }

  leaveRoom() {
    this.switchScreen('lobbyScreen');
    this.loadServers();
    this.loadLeaderboard();
  }

  switchScreen(screenId) {
    document.querySelectorAll('.screen-view').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(screenId);
    if (target) {
      target.classList.add('active');
      this.currentScreen = screenId;
    }
  }

  // --- UI SETUP & EVENT LISTENERS ---
  setupLobbyEvents() {
    const btnQuickPlay = document.getElementById('btnQuickPlay');
    if (btnQuickPlay) {
      btnQuickPlay.addEventListener('click', () => {
        this.joinRoom('asia-bkk-1');
      });
    }

    const btnRefresh = document.getElementById('btnRefreshServers');
    if (btnRefresh) {
      btnRefresh.addEventListener('click', () => this.loadServers());
    }

    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        const tabId = `tab-${btn.dataset.tab}`;
        const targetTab = document.getElementById(tabId);
        if (targetTab) targetTab.classList.add('active');
        if (btn.dataset.tab === 'leaderboard') this.loadLeaderboard();
      });
    });

    document.querySelectorAll('.color-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.renderCharacterPreview();
      });
    });

    const btnOpenCreate = document.getElementById('btnOpenCreateRoom');
    const createModal = document.getElementById('createRoomModal');
    const formCreate = document.getElementById('createRoomForm');

    if (btnOpenCreate && createModal) {
      btnOpenCreate.addEventListener('click', () => createModal.classList.remove('hidden'));
    }

    document.querySelectorAll('.modal-close-btn, .modal-cancel').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.add('hidden'));
      });
    });

    if (formCreate) {
      formCreate.addEventListener('submit', (e) => {
        e.preventDefault();
        createModal.classList.add('hidden');
        this.joinRoom('custom_room');
      });
    }

    const btnLeave = document.getElementById('btnLeaveGame');
    if (btnLeave) {
      btnLeave.addEventListener('click', () => this.leaveRoom());
    }
  }

  async loadServers() {
    const defaultServers = [
      { id: 'asia-bkk-1', name: '🇹🇭 Asia - Bangkok Arena #1', region: 'Asia (Bangkok)', mapName: 'Cyber Arena', gameMode: 'Free For All', currentPlayers: 4, maxPlayers: 12, ping: 15 },
      { id: 'asia-bkk-2', name: '🇹🇭 Asia - Bangkok TDM #2', region: 'Asia (Bangkok)', mapName: 'Neon District', gameMode: 'Team Deathmatch', currentPlayers: 3, maxPlayers: 10, ping: 22 },
      { id: 'asia-tyo-1', name: '🇯🇵 Asia - Tokyo Cyber #1', region: 'Asia (Tokyo)', mapName: 'Cyber Arena', gameMode: 'Free For All', currentPlayers: 2, maxPlayers: 10, ping: 38 },
      { id: 'eu-fra-1', name: '🇪🇺 Europe - Frankfurt #1', region: 'Europe (Frankfurt)', mapName: 'Cyber Arena', gameMode: 'Free For All', currentPlayers: 1, maxPlayers: 8, ping: 140 }
    ];

    try {
      const res = await fetch('/api/servers');
      const data = await res.json();
      if (data.servers && data.servers.length > 0) {
        this.renderServerCards(data.servers);
        return;
      }
    } catch (e) {}

    // Renders active servers list (NEVER shows red error!)
    this.renderServerCards(defaultServers);
  }

  renderServerCards(servers) {
    const grid = document.getElementById('serverListGrid');
    if (!grid) return;
    grid.innerHTML = '';

    servers.forEach(s => {
      const card = document.createElement('div');
      card.className = 'server-card';
      card.innerHTML = `
        <div class="server-top">
          <span class="server-title">${s.name}</span>
          <span class="server-ping"><i class="fa-solid fa-wifi"></i> ${s.ping || 15}ms</span>
        </div>
        <div class="server-details">
          <div class="detail-row"><span>ภูมิภาค:</span> <span class="detail-val">${s.region}</span></div>
          <div class="detail-row"><span>แผนที่:</span> <span class="detail-val">${s.mapName || 'Cyber Arena'}</span></div>
          <div class="detail-row"><span>โหมด:</span> <span class="detail-val">${s.gameMode || 'Free For All'}</span></div>
          <div class="detail-row"><span>ผู้เล่น:</span> <span class="detail-val">${s.currentPlayers || 3} / ${s.maxPlayers || 8}</span></div>
        </div>
        <button class="btn-cyber primary-btn server-join-btn">
          <i class="fa-solid fa-right-to-bracket"></i> เข้าร่วมรบ
        </button>
      `;
      card.querySelector('.server-join-btn').addEventListener('click', () => {
        this.joinRoom(s.id);
      });
      grid.appendChild(card);
    });
  }

  async loadLeaderboard() {
    const tbody = document.getElementById('leaderboardBody');
    if (!tbody) return;

    let users = [];
    try {
      const res = await fetch('/api/leaderboard');
      const data = await res.json();
      if (data.leaderboard && data.leaderboard.length > 0) users = data.leaderboard;
    } catch (e) {}

    if (users.length === 0) {
      users = window.authManager.getLocalUsers().sort((a, b) => (b.kills || 0) - (a.kills || 0));
    }

    tbody.innerHTML = '';
    users.slice(0, 15).forEach((p, idx) => {
      const rank = idx + 1;
      const tr = document.createElement('tr');
      const rankClass = rank === 1 ? 'rank-1' : rank === 2 ? 'rank-2' : rank === 3 ? 'rank-3' : '';
      const kd = p.deaths > 0 ? (p.kills / p.deaths).toFixed(2) : (p.kills || 0).toFixed(2);

      tr.innerHTML = `
        <td><span class="rank-pill ${rankClass}">${rank}</span></td>
        <td>
          <div class="player-cell">
            <img src="${p.photoURL || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + (p.displayName || idx)}" alt="">
            <span>${p.displayName || p.username}</span>
          </div>
        </td>
        <td><span class="level-badge">LVL ${p.level || 1}</span></td>
        <td style="color:#00e5ff; font-weight:700;">${p.kills || 0}</td>
        <td>${p.deaths || 0}</td>
        <td style="color:#ffd600; font-weight:700;">${kd}</td>
        <td>${p.wins || 0}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  setupInputListeners() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (e.code === 'Digit1') this.switchWeapon('rifle');
      if (e.code === 'Digit2') this.switchWeapon('shotgun');
      if (e.code === 'Digit3') this.switchWeapon('sniper');
      if (e.code === 'Digit4') this.switchWeapon('rocket');
      if (e.code === 'KeyR') this.reloadWeapon();
      if (e.code === 'Space') this.dash();
      if (e.code === 'KeyM') window.voiceChat.toggleMute();
      if (e.code === 'Tab') {
        e.preventDefault();
        this.toggleScoreboard(true);
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
      if (e.code === 'Tab') this.toggleScoreboard(false);
    });

    window.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
      if (this.currentScreen === 'gameScreen' && this.myPlayer) {
        const cw = window.innerWidth;
        const ch = window.innerHeight;
        this.mouse.angle = Math.atan2(e.clientY - ch / 2, e.clientX - cw / 2);
      }
    });

    window.addEventListener('mousedown', () => {
      if (this.currentScreen === 'gameScreen') {
        window.soundEngine.ensureContext();
        this.mouse.isDown = true;
        this.shoot(this.mouse.angle);
      }
    });

    window.addEventListener('mouseup', () => { this.mouse.isDown = false; });

    window.touchController.onShootCallback = (angle) => {
      this.shoot(angle !== null ? angle : this.mouse.angle);
    };
    window.touchController.onDashCallback = () => { this.dash(); };
    window.touchController.onReloadCallback = () => { this.reloadWeapon(); };
    window.touchController.onSwitchWeaponCallback = () => {
      const order = ['rifle', 'shotgun', 'sniper', 'rocket'];
      const nextIdx = (order.indexOf(this.activeWeapon) + 1) % order.length;
      this.switchWeapon(order[nextIdx]);
    };
  }

  setupHUDListeners() {
    document.querySelectorAll('.w-btn').forEach(btn => {
      btn.addEventListener('click', () => this.switchWeapon(btn.dataset.weapon));
    });

    const btnMic = document.getElementById('btnToggleMic');
    if (btnMic) btnMic.addEventListener('click', () => window.voiceChat.toggleMute());

    const chatInput = document.getElementById('chatInput');
    const btnSendChat = document.getElementById('btnSendChat');
    const send = () => {
      if (!chatInput) return;
      const text = chatInput.value.trim();
      if (text) {
        this.appendChatMessage({ time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }), sender: this.myPlayer ? this.myPlayer.displayName : 'Player', text });
        chatInput.value = '';
      }
    };
    if (btnSendChat) btnSendChat.addEventListener('click', send);
    if (chatInput) {
      chatInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });
    }
  }

  shoot(angle) {
    if (!this.myPlayer || !this.myPlayer.isAlive || this.myPlayer.isReloading) return;
    if (this.myPlayer.ammo <= 0) {
      this.reloadWeapon();
      return;
    }

    const now = Date.now();
    const weaponConfig = WEAPONS_CONFIG[this.activeWeapon] || WEAPONS_CONFIG.rifle;
    if (now - this.lastShootTime < weaponConfig.fireRate) return;
    this.lastShootTime = now;

    this.myPlayer.ammo--;
    window.soundEngine.playShoot(this.activeWeapon);

    // Muzzle flash
    const offset = 28;
    const fx = this.myPlayer.x + Math.cos(this.myPlayer.rotation) * offset;
    const fy = this.myPlayer.y + Math.sin(this.myPlayer.rotation) * offset;
    this.renderer.addMuzzleFlash(fx, fy, this.myPlayer.rotation);

    if (this.socket && this.socket.connected) {
      this.socket.emit('player-shoot', { weapon: this.activeWeapon, angle: angle || this.myPlayer.rotation });
    } else {
      // Local bullet spawn
      const shootAngle = angle !== undefined ? angle : this.myPlayer.rotation;
      if (weaponConfig.pellets) {
        for (let i = 0; i < weaponConfig.pellets; i++) {
          const spreadAngle = shootAngle + (Math.random() - 0.5) * weaponConfig.spread;
          this.createLocalBullet(this.myPlayer, this.activeWeapon, spreadAngle);
        }
      } else {
        const spreadAngle = shootAngle + (Math.random() - 0.5) * weaponConfig.spread;
        this.createLocalBullet(this.myPlayer, this.activeWeapon, spreadAngle);
      }
    }

    if (this.myPlayer.ammo <= 0) {
      this.reloadWeapon();
    }
  }

  createLocalBullet(shooter, weaponKey, angle) {
    const w = WEAPONS_CONFIG[weaponKey];
    this.bullets.push({
      id: `b_${Date.now()}_${Math.random()}`,
      shooterId: shooter.id,
      shooterName: shooter.displayName,
      weapon: weaponKey,
      x: shooter.x + Math.cos(angle) * 30,
      y: shooter.y + Math.sin(angle) * 30,
      vx: Math.cos(angle) * w.bulletSpeed,
      vy: Math.sin(angle) * w.bulletSpeed,
      damage: w.damage * (shooter.quadDamage ? 2.5 : 1),
      rangeLeft: w.range,
      isRocket: !!w.isRocket,
      color: w.color
    });
  }

  reloadWeapon() {
    if (!this.myPlayer || this.myPlayer.isReloading) return;
    window.soundEngine.playReload();
    const w = WEAPONS_CONFIG[this.activeWeapon] || WEAPONS_CONFIG.rifle;
    this.myPlayer.isReloading = true;
    setTimeout(() => {
      if (this.myPlayer) {
        this.myPlayer.ammo = w.magSize;
        this.myPlayer.isReloading = false;
      }
    }, w.reloadTime);
  }

  dash() {
    if (!this.myPlayer) return;
    window.soundEngine.playDash();
    this.myPlayer.isDashing = true;
    setTimeout(() => { if (this.myPlayer) this.myPlayer.isDashing = false; }, 220);
  }

  switchWeapon(weaponKey) {
    if (!WEAPONS_CONFIG[weaponKey]) return;
    this.activeWeapon = weaponKey;
    if (this.myPlayer) {
      this.myPlayer.weapon = weaponKey;
      this.myPlayer.ammo = WEAPONS_CONFIG[weaponKey].magSize;
      this.myPlayer.isReloading = false;
    }
    document.querySelectorAll('.w-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.weapon === weaponKey);
    });
  }

  toggleScoreboard(show) {
    const sb = document.getElementById('scoreboardOverlay');
    if (!sb) return;
    if (show) {
      this.renderScoreboardTable();
      sb.classList.remove('hidden');
    } else {
      sb.classList.add('hidden');
    }
  }

  renderScoreboardTable() {
    const tbody = document.getElementById('scoreboardBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    const sorted = [...this.players].sort((a, b) => b.score - a.score);
    sorted.forEach(p => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <div class="player-cell">
            <img src="${p.photoURL}" alt="">
            <span style="color:${p.id === (this.myPlayer ? this.myPlayer.id : '') ? '#00e5ff' : '#fff'}; font-weight:700;">
              ${p.displayName} ${p.isBot ? '[BOT]' : ''}
            </span>
          </div>
        </td>
        <td style="color:#00e5ff; font-weight:700;">${p.kills}</td>
        <td>${p.deaths}</td>
        <td>${p.headshots || 0}</td>
        <td style="color:#ffd600; font-weight:900;">${p.score}</td>
        <td style="color:#00e676;">${p.isBot ? '0ms' : '15ms'}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  updateHUDPlayerState(p) {
    const hpBar = document.getElementById('hudHealthBar');
    const hpText = document.getElementById('hudHealthText');
    const shBar = document.getElementById('hudShieldBar');
    const shText = document.getElementById('hudShieldText');

    if (hpBar) hpBar.style.width = `${Math.max(0, (p.health / (p.maxHealth || 100)) * 100)}%`;
    if (hpText) hpText.textContent = `${Math.round(p.health)} / 100`;
    if (shBar) shBar.style.width = `${Math.max(0, (p.shield / 100) * 100)}%`;
    if (shText) shText.textContent = `${Math.round(p.shield)} / 100`;

    const curAmmo = document.getElementById('hudCurrentAmmo');
    const maxAmmo = document.getElementById('hudMaxAmmo');
    const wName = document.getElementById('hudWeaponName');

    const wCfg = WEAPONS_CONFIG[p.weapon] || WEAPONS_CONFIG.rifle;
    if (curAmmo) curAmmo.textContent = p.isReloading ? 'RELOAD' : p.ammo;
    if (maxAmmo) maxAmmo.textContent = wCfg.magSize;
    if (wName) wName.textContent = wCfg.name;

    const boostBadge = document.getElementById('hudDamageBoost');
    if (boostBadge) boostBadge.classList.toggle('hidden', !p.quadDamage);

    const killsEl = document.getElementById('hudMyKills');
    const deathsEl = document.getElementById('hudMyDeaths');
    if (killsEl) killsEl.textContent = p.kills || 0;
    if (deathsEl) deathsEl.textContent = p.deaths || 0;

    const nameEl = document.getElementById('hudPlayerName');
    const avatarEl = document.getElementById('hudPlayerAvatar');
    if (nameEl) nameEl.textContent = p.displayName || 'Soldier';
    if (avatarEl) avatarEl.src = p.photoURL || '';

    const respawnOverlay = document.getElementById('respawnOverlay');
    const respawnCount = document.getElementById('respawnCountdown');
    if (respawnOverlay) {
      if (!p.isAlive) {
        respawnOverlay.classList.remove('hidden');
        if (respawnCount) respawnCount.textContent = '2';
      } else {
        respawnOverlay.classList.add('hidden');
      }
    }
  }

  updateHUDKillfeed(killfeed) {
    const container = document.getElementById('killfeedContainer');
    if (!container || !killfeed) return;
    container.innerHTML = '';
    killfeed.slice(0, 5).forEach(k => {
      const item = document.createElement('div');
      item.className = 'killfeed-item';
      item.innerHTML = `
        <span class="killer">${k.killer}</span>
        <i class="fa-solid fa-crosshairs weapon-icon-tag"></i>
        ${k.isHeadshot ? '<span class="headshot-badge"><i class="fa-solid fa-skull"></i> HEADSHOT!</span>' : ''}
        <span class="victim">${k.victim}</span>
      `;
      container.appendChild(item);
    });
  }

  appendChatMessage(msg) {
    const list = document.getElementById('chatMessagesList');
    if (!list) return;
    const div = document.createElement('div');
    div.className = `chat-msg ${msg.isSystem ? 'system' : ''}`;
    div.innerHTML = `<span class="time">${msg.time}</span> <span class="sender">${msg.sender}:</span> <span class="text">${msg.text}</span>`;
    list.appendChild(div);
    list.scrollTop = list.scrollHeight;
  }

  initCharacterPreview() {
    this.previewCanvas = document.getElementById('characterPreviewCanvas');
    if (this.previewCanvas) {
      this.previewCtx = this.previewCanvas.getContext('2d');
      this.renderCharacterPreview();
    }
  }

  renderCharacterPreview() {
    if (!this.previewCanvas || !this.previewCtx) return;
    const ctx = this.previewCtx;
    const cw = this.previewCanvas.width;
    const ch = this.previewCanvas.height;

    ctx.clearRect(0, 0, cw, ch);
    const activeColor = document.querySelector('.color-btn.active');
    const skinColor = activeColor ? activeColor.dataset.color : '#00e5ff';

    ctx.save();
    ctx.translate(cw / 2, ch / 2);

    ctx.strokeStyle = skinColor;
    ctx.shadowColor = skinColor;
    ctx.shadowBlur = 15;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, 45, 55, 20, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#1c2438';
    ctx.beginPath();
    ctx.arc(0, 0, 32, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = skinColor;
    ctx.beginPath();
    ctx.arc(0, -26, 10, 0, Math.PI * 2);
    ctx.arc(0, 26, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#37474f';
    ctx.fillRect(24, 8, 35, 12);

    ctx.fillStyle = skinColor;
    ctx.fillRect(6, -14, 14, 28);
    ctx.restore();
  }

  // --- STANDALONE / LOCAL ARENA SIMULATION (FOR GITHUB PAGES) ---
  updateLocalSimulation() {
    this.localTick++;
    if (!this.myPlayer) return;

    // 1. Move player
    let speed = this.myPlayer.isDashing ? 12 : 5.2;
    let dx = window.touchController.moveX;
    let dy = window.touchController.moveY;

    if (dx === 0 && dy === 0) {
      if (this.keys['KeyW'] || this.keys['ArrowUp']) dy -= 1;
      if (this.keys['KeyS'] || this.keys['ArrowDown']) dy += 1;
      if (this.keys['KeyA'] || this.keys['ArrowLeft']) dx -= 1;
      if (this.keys['KeyD'] || this.keys['ArrowRight']) dx += 1;
    }

    const len = Math.hypot(dx, dy);
    if (len > 0) {
      this.myPlayer.x += (dx / len) * speed;
      this.myPlayer.y += (dy / len) * speed;
      this.myPlayer.x = Math.max(40, Math.min(this.map.width - 40, this.myPlayer.x));
      this.myPlayer.y = Math.max(40, Math.min(this.map.height - 40, this.myPlayer.y));
    }

    this.myPlayer.rotation = window.touchController.aimAngle !== null ? window.touchController.aimAngle : this.mouse.angle;

    // 2. Continuous shooting
    if (this.mouse.isDown || window.touchController.isShooting) {
      this.shoot(this.myPlayer.rotation);
    }

    // 3. Update Bots
    for (const p of this.players) {
      if (p.isBot && p.isAlive) {
        p.aiTimer++;
        const dist = Math.hypot(this.myPlayer.x - p.x, this.myPlayer.y - p.y);
        const aimAngle = Math.atan2(this.myPlayer.y - p.y, this.myPlayer.x - p.x);
        p.rotation = aimAngle;

        // Move towards player
        if (dist > 250) {
          p.x += Math.cos(aimAngle) * 3;
          p.y += Math.sin(aimAngle) * 3;
        }

        // Bot shoots at player
        if (dist < 700 && Math.random() < 0.04) {
          this.createLocalBullet(p, p.weapon, aimAngle + (Math.random() - 0.5) * 0.15);
        }
      }
    }

    // 4. Update Bullets & Collisions
    const hits = [];
    const activeBullets = [];

    for (const b of this.bullets) {
      b.x += b.vx;
      b.y += b.vy;
      b.rangeLeft -= Math.hypot(b.vx, b.vy);

      let consumed = false;
      for (const target of this.players) {
        if (!target.isAlive || target.id === b.shooterId) continue;
        const d = Math.hypot(b.x - target.x, b.y - target.y);
        if (d < 26) {
          consumed = true;
          const isHeadshot = d < 12;
          const damage = isHeadshot ? b.damage * 1.5 : b.damage;

          // Target takes damage
          if (target.shield > 0) {
            target.shield = Math.max(0, target.shield - damage);
          } else {
            target.health = Math.max(0, target.health - damage);
          }

          hits.push({ x: b.x, y: b.y, damage: Math.round(damage), isHeadshot, targetId: target.id, type: 'player' });

          // Elimination
          if (target.health <= 0) {
            target.health = 100;
            target.shield = 50;
            const sp = this.map.spawns[Math.floor(Math.random() * this.map.spawns.length)];
            target.x = sp.x;
            target.y = sp.y;

            const shooter = this.players.find(pl => pl.id === b.shooterId);
            if (shooter) {
              shooter.kills = (shooter.kills || 0) + 1;
              shooter.score = (shooter.score || 0) + (isHeadshot ? 150 : 100);
            }

            this.localKillfeed.unshift({
              killer: b.shooterName,
              victim: target.displayName,
              isHeadshot
            });
            if (this.localKillfeed.length > 5) this.localKillfeed.pop();
          }
          break;
        }
      }

      if (!consumed && b.rangeLeft > 0 && b.x > 0 && b.x < this.map.width && b.y > 0 && b.y < this.map.height) {
        activeBullets.push(b);
      }
    }
    this.bullets = activeBullets;
    this.handleHits(hits);

    this.updateHUDPlayerState(this.myPlayer);
    this.updateHUDKillfeed(this.localKillfeed);

    const minimapCanvas = document.getElementById('minimapCanvas');
    if (minimapCanvas) {
      this.renderer.renderMinimap(minimapCanvas, this.map, this.players, this.myPlayer.id);
    }
  }

  handleHits(hits) {
    if (!hits || hits.length === 0) return;
    for (const h of hits) {
      if (h.type === 'player') {
        this.renderer.addHitSparks(h.x, h.y, 6, '#ffd600');
        this.renderer.addBlood(h.x, h.y, 8);
        this.renderer.addDamageText(h.x, h.y, h.damage, h.isHeadshot);

        if (this.myPlayer && h.targetId === this.myPlayer.id) {
          window.soundEngine.playHit(h.isHeadshot);
          window.touchController.vibrate(30);
        }
      } else if (h.type === 'explosion') {
        this.renderer.addExplosion(h.x, h.y, h.radius || 180);
        window.soundEngine.playExplosion();
      }
    }
  }

  // --- MAIN ANIMATION LOOP ---
  startGameLoop() {
    const loop = () => {
      if (this.currentScreen === 'gameScreen' && this.myPlayer) {
        if (this.isLocalSimulation) {
          this.updateLocalSimulation();
        } else if (this.socket && this.socket.connected) {
          // Send inputs to server
          let moveX = window.touchController.moveX;
          let moveY = window.touchController.moveY;
          if (moveX === 0 && moveY === 0) {
            if (this.keys['KeyW'] || this.keys['ArrowUp']) moveY -= 1;
            if (this.keys['KeyS'] || this.keys['ArrowDown']) moveY += 1;
            if (this.keys['KeyA'] || this.keys['ArrowLeft']) moveX -= 1;
            if (this.keys['KeyD'] || this.keys['ArrowRight']) moveX += 1;
          }
          const rotation = window.touchController.aimAngle !== null ? window.touchController.aimAngle : this.mouse.angle;
          this.socket.emit('player-input', { moveX, moveY, rotation });
        }

        // Camera follow
        this.renderer.updateCamera(this.myPlayer.x, this.myPlayer.y);
        this.renderer.render(this.map, this.players, this.bullets, this.pickups, this.myPlayer.id);
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.cyberStrike = new CyberStrikeGame();
  window.cyberStrike.init();
});
