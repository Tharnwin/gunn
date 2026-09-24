const db = require('./database');

// Game Maps
const MAPS = {
  cyber_arena: {
    name: 'Cyber Arena',
    width: 2400,
    height: 1800,
    obstacles: [
      // Central pillars
      { x: 1100, y: 800, w: 200, h: 200, type: 'pillar', hp: 9999 },
      // Corner barriers
      { x: 400, y: 350, w: 250, h: 60, type: 'wall' },
      { x: 400, y: 350, w: 60, h: 250, type: 'wall' },
      { x: 1750, y: 350, w: 250, h: 60, type: 'wall' },
      { x: 1940, y: 350, w: 60, h: 250, type: 'wall' },
      { x: 400, y: 1200, w: 60, h: 250, type: 'wall' },
      { x: 400, y: 1390, w: 250, h: 60, type: 'wall' },
      { x: 1940, y: 1200, w: 60, h: 250, type: 'wall' },
      { x: 1750, y: 1390, w: 250, h: 60, type: 'wall' },
      // Central cover blocks
      { x: 800, y: 850, w: 80, h: 100, type: 'crate' },
      { x: 1520, y: 850, w: 80, h: 100, type: 'crate' },
      { x: 1160, y: 500, w: 80, h: 80, type: 'crate' },
      { x: 1160, y: 1220, w: 80, h: 80, type: 'crate' },
      // Explosive barrels
      { x: 700, y: 500, w: 40, h: 40, type: 'barrel', explosive: true, hp: 40 },
      { x: 1700, y: 500, w: 40, h: 40, type: 'barrel', explosive: true, hp: 40 },
      { x: 700, y: 1300, w: 40, h: 40, type: 'barrel', explosive: true, hp: 40 },
      { x: 1700, y: 1300, w: 40, h: 40, type: 'barrel', explosive: true, hp: 40 }
    ],
    spawns: [
      { x: 300, y: 300 },
      { x: 2100, y: 300 },
      { x: 300, y: 1500 },
      { x: 2100, y: 1500 },
      { x: 1200, y: 250 },
      { x: 1200, y: 1550 },
      { x: 600, y: 900 },
      { x: 1800, y: 900 }
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
  },
  neon_city: {
    name: 'Neon District',
    width: 2600,
    height: 2000,
    obstacles: [
      { x: 600, y: 600, w: 400, h: 100, type: 'wall' },
      { x: 1600, y: 600, w: 400, h: 100, type: 'wall' },
      { x: 600, y: 1300, w: 400, h: 100, type: 'wall' },
      { x: 1600, y: 1300, w: 400, h: 100, type: 'wall' },
      { x: 1200, y: 900, w: 200, h: 200, type: 'pillar' },
      { x: 900, y: 950, w: 60, h: 100, type: 'crate' },
      { x: 1640, y: 950, w: 60, h: 100, type: 'crate' }
    ],
    spawns: [
      { x: 400, y: 400 },
      { x: 2200, y: 400 },
      { x: 400, y: 1600 },
      { x: 2200, y: 1600 }
    ],
    pickupSpawns: [
      { x: 1300, y: 1000, type: 'quad_damage' },
      { x: 800, y: 800, type: 'health' },
      { x: 1800, y: 800, type: 'shield' }
    ]
  }
};

// Weapons Specification
const WEAPONS = {
  rifle: {
    name: 'Assault Rifle',
    damage: 24,
    fireRate: 110, // ms
    magSize: 30,
    reloadTime: 1600,
    bulletSpeed: 19,
    spread: 0.05,
    range: 1200,
    color: '#00e5ff'
  },
  shotgun: {
    name: 'Pump Shotgun',
    damage: 16, // per pellet (x6)
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

class GameRoom {
  constructor(id, options = {}) {
    this.id = id;
    this.name = options.name || `Arena-${id.substr(0, 4)}`;
    this.region = options.region || 'Asia (Bangkok)';
    this.mapId = options.mapId || 'cyber_arena';
    this.map = MAPS[this.mapId] || MAPS.cyber_arena;
    this.maxPlayers = options.maxPlayers || 8;
    this.gameMode = options.gameMode || 'Free For All';
    this.isPrivate = !!options.password;
    this.password = options.password || '';
    this.allowBots = options.allowBots !== false;
    this.createdAt = Date.now();

    this.players = {}; // socketId -> Player
    this.bullets = [];
    this.pickups = [];
    this.killfeed = [];
    this.chatMessages = [];
    this.stateTick = 0;

    this.initPickups();
    this.initBots();
  }

  initPickups() {
    this.pickups = (this.map.pickupSpawns || []).map((sp, idx) => ({
      id: `pickup_${idx}`,
      x: sp.x,
      y: sp.y,
      type: sp.type,
      active: true,
      respawnTimer: 0
    }));
  }

  initBots() {
    if (!this.allowBots) return;
    const botCount = 2; // Keep at least 2 bots active for instant action
    for (let i = 0; i < botCount; i++) {
      this.addBot(i + 1);
    }
  }

  addBot(index) {
    const botId = `bot_${this.id}_${index}`;
    const spawn = this.getRandomSpawn();
    const botWeapons = ['rifle', 'shotgun', 'sniper'];
    const selectedWeapon = botWeapons[index % botWeapons.length];

    this.players[botId] = {
      id: botId,
      socketId: botId,
      isBot: true,
      displayName: `[BOT] Tactical_${index}`,
      photoURL: `https://api.dicebear.com/7.x/bottts/svg?seed=bot_${index}`,
      x: spawn.x,
      y: spawn.y,
      rotation: Math.random() * Math.PI * 2,
      health: 100,
      maxHealth: 100,
      shield: 50,
      maxShield: 100,
      kills: 0,
      deaths: 0,
      score: 0,
      isAlive: true,
      weapon: selectedWeapon,
      ammo: WEAPONS[selectedWeapon].magSize,
      isReloading: false,
      isDashing: false,
      lastShotTime: 0,
      skinColor: '#ff007f',
      targetPlayerId: null,
      aiState: 'patrol',
      aiTimer: 0
    };
  }

  getRandomSpawn() {
    const spawns = this.map.spawns;
    return spawns[Math.floor(Math.random() * spawns.length)];
  }

  addPlayer(socketId, profile = {}) {
    const spawn = this.getRandomSpawn();
    const defaultWeapon = profile.favoriteWeaponKey || 'rifle';

    const player = {
      id: profile.id || socketId,
      socketId: socketId,
      isBot: false,
      displayName: profile.displayName || `Soldier_${socketId.substr(0, 4)}`,
      photoURL: profile.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${socketId}`,
      level: profile.level || 1,
      x: spawn.x,
      y: spawn.y,
      vx: 0,
      vy: 0,
      rotation: 0,
      health: 100,
      maxHealth: 100,
      shield: 50,
      maxShield: 100,
      kills: 0,
      deaths: 0,
      headshots: 0,
      damage: 0,
      score: 0,
      isAlive: true,
      respawnTimer: 0,
      weapon: defaultWeapon,
      ammo: WEAPONS[defaultWeapon] ? WEAPONS[defaultWeapon].magSize : 30,
      isReloading: false,
      isDashing: false,
      dashCooldown: 0,
      skinColor: profile.skinColor || '#00e5ff',
      isSpeaking: false,
      quadDamageTimer: 0
    };

    this.players[socketId] = player;

    // Broadcast system message
    this.addChatMessage({
      sender: 'SYSTEM',
      text: `${player.displayName} joined the battle!`,
      isSystem: true
    });

    return player;
  }

  removePlayer(socketId) {
    const player = this.players[socketId];
    if (player) {
      this.addChatMessage({
        sender: 'SYSTEM',
        text: `${player.displayName} left the battle.`,
        isSystem: true
      });
      delete this.players[socketId];
    }
  }

  addChatMessage(msg) {
    const message = {
      id: `chat_${Date.now()}_${Math.random()}`,
      time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
      ...msg
    };
    this.chatMessages.push(message);
    if (this.chatMessages.length > 30) this.chatMessages.shift();
    return message;
  }

  // Handle player inputs (movement, rotation, actions)
  handleInput(socketId, input) {
    const player = this.players[socketId];
    if (!player || !player.isAlive) return;

    // Movement speed
    let speed = 5.2;
    if (player.isDashing) speed = 12.0;

    let dx = 0;
    let dy = 0;

    if (input.moveX !== undefined && input.moveY !== undefined) {
      dx = input.moveX;
      dy = input.moveY;
    } else {
      if (input.up) dy -= 1;
      if (input.down) dy += 1;
      if (input.left) dx -= 1;
      if (input.right) dx += 1;
    }

    // Normalize
    const len = Math.hypot(dx, dy);
    if (len > 0) {
      const norm = Math.min(len, 1);
      const nx = (dx / len) * norm * speed;
      const ny = (dy / len) * norm * speed;

      // Wall collision check
      const nextX = player.x + nx;
      const nextY = player.y + ny;

      if (!this.checkWallCollision(nextX, player.y, 22)) {
        player.x = Math.max(30, Math.min(this.map.width - 30, nextX));
      }
      if (!this.checkWallCollision(player.x, nextY, 22)) {
        player.y = Math.max(30, Math.min(this.map.height - 30, nextY));
      }
    }

    if (input.rotation !== undefined) {
      player.rotation = input.rotation;
    }

    if (input.dash && player.dashCooldown <= 0) {
      player.isDashing = true;
      player.dashCooldown = 60; // ~1 second cooldown at 60fps
      setTimeout(() => { if (player) player.isDashing = false; }, 220);
    }
  }

  checkWallCollision(x, y, radius = 20) {
    for (const obs of this.map.obstacles) {
      // Circle vs Box collision
      const nearestX = Math.max(obs.x, Math.min(x, obs.x + obs.w));
      const nearestY = Math.max(obs.y, Math.min(y, obs.y + obs.h));
      const dist = Math.hypot(x - nearestX, y - nearestY);
      if (dist < radius) return true;
    }
    return false;
  }

  // Handle Player Shooting
  handleShoot(socketId, shootData) {
    const player = this.players[socketId];
    if (!player || !player.isAlive || player.isReloading) return null;

    const weaponKey = shootData.weapon || player.weapon || 'rifle';
    const weapon = WEAPONS[weaponKey] || WEAPONS.rifle;

    if (player.ammo <= 0) {
      this.handleReload(socketId);
      return null;
    }

    player.ammo -= 1;
    const now = Date.now();
    player.lastShotTime = now;

    const angle = shootData.angle !== undefined ? shootData.angle : player.rotation;
    const createdBullets = [];

    const isQuad = player.quadDamageTimer > 0;
    const damageMult = isQuad ? 2.5 : 1.0;

    if (weapon.pellets) {
      // Shotgun spread
      for (let i = 0; i < weapon.pellets; i++) {
        const spreadAngle = angle + (Math.random() - 0.5) * weapon.spread;
        createdBullets.push(this.createBullet(player, weaponKey, spreadAngle, damageMult));
      }
    } else {
      const spreadAngle = angle + (Math.random() - 0.5) * weapon.spread;
      createdBullets.push(this.createBullet(player, weaponKey, spreadAngle, damageMult));
    }

    if (player.ammo <= 0) {
      this.handleReload(socketId);
    }

    return createdBullets;
  }

  createBullet(shooter, weaponKey, angle, damageMult) {
    const weapon = WEAPONS[weaponKey] || WEAPONS.rifle;
    // Offset spawn position to gun barrel
    const gunOffset = 32;
    const bx = shooter.x + Math.cos(angle) * gunOffset;
    const by = shooter.y + Math.sin(angle) * gunOffset;

    const bullet = {
      id: `b_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      shooterId: shooter.socketId,
      shooterName: shooter.displayName,
      weapon: weaponKey,
      x: bx,
      y: by,
      vx: Math.cos(angle) * weapon.bulletSpeed,
      vy: Math.sin(angle) * weapon.bulletSpeed,
      damage: Math.round(weapon.damage * damageMult),
      rangeLeft: weapon.range,
      isRocket: !!weapon.isRocket,
      splashRadius: weapon.splashRadius || 0,
      color: weapon.color,
      angle: angle
    };

    this.bullets.push(bullet);
    return bullet;
  }

  handleReload(socketId) {
    const player = this.players[socketId];
    if (!player || !player.isAlive || player.isReloading) return;

    const weapon = WEAPONS[player.weapon] || WEAPONS.rifle;
    if (player.ammo === weapon.magSize) return;

    player.isReloading = true;
    setTimeout(() => {
      if (player && player.isAlive) {
        player.ammo = weapon.magSize;
        player.isReloading = false;
      }
    }, weapon.reloadTime);
  }

  handleSwitchWeapon(socketId, newWeapon) {
    const player = this.players[socketId];
    if (!player || !player.isAlive) return;
    if (WEAPONS[newWeapon]) {
      player.weapon = newWeapon;
      player.ammo = WEAPONS[newWeapon].magSize;
      player.isReloading = false;
    }
  }

  // Update loop (called at 30-40 Hz)
  update() {
    this.stateTick++;

    // Update pickups
    for (const pickup of this.pickups) {
      if (!pickup.active) {
        pickup.respawnTimer--;
        if (pickup.respawnTimer <= 0) {
          pickup.active = true;
        }
      }
    }

    // Update players cooldowns & pickups collection
    for (const id in this.players) {
      const p = this.players[id];
      if (!p.isAlive) {
        if (p.respawnTimer > 0) {
          p.respawnTimer--;
          if (p.respawnTimer <= 0) {
            this.respawnPlayer(p);
          }
        }
        continue;
      }

      if (p.dashCooldown > 0) p.dashCooldown--;
      if (p.quadDamageTimer > 0) p.quadDamageTimer--;

      // Check pickup grab
      for (const pickup of this.pickups) {
        if (pickup.active && Math.hypot(p.x - pickup.x, p.y - pickup.y) < 36) {
          pickup.active = false;
          pickup.respawnTimer = 600; // ~15 seconds

          if (pickup.type === 'health') {
            p.health = Math.min(p.maxHealth, p.health + 50);
          } else if (pickup.type === 'shield') {
            p.shield = Math.min(p.maxShield, p.shield + 50);
          } else if (pickup.type === 'ammo') {
            const w = WEAPONS[p.weapon] || WEAPONS.rifle;
            p.ammo = w.magSize;
            p.isReloading = false;
          } else if (pickup.type === 'quad_damage') {
            p.quadDamageTimer = 400; // ~10 seconds
          }
        }
      }

      // Update AI Bots
      if (p.isBot) {
        this.updateBotAI(p);
      }
    }

    // Update Bullets
    const activeBullets = [];
    const hits = [];

    for (let i = 0; i < this.bullets.length; i++) {
      const b = this.bullets[i];
      b.x += b.vx;
      b.y += b.vy;
      const distTraveled = Math.hypot(b.vx, b.vy);
      b.rangeLeft -= distTraveled;

      // Wall hit check
      if (this.checkWallCollision(b.x, b.y, 8)) {
        if (b.isRocket) {
          this.explodeRocket(b, hits);
        } else {
          hits.push({ x: b.x, y: b.y, type: 'wall' });
        }
        continue;
      }

      // Player hit check
      let bulletConsumed = false;
      for (const pid in this.players) {
        const target = this.players[pid];
        if (!target.isAlive || target.socketId === b.shooterId) continue;

        const dist = Math.hypot(b.x - target.x, b.y - target.y);
        if (dist < 26) {
          // Hit! Check headshot
          const isHeadshot = dist < 12;
          const finalDamage = isHeadshot ? Math.round(b.damage * 1.5) : b.damage;

          if (b.isRocket) {
            this.explodeRocket(b, hits);
          } else {
            this.applyDamage(target, finalDamage, b.shooterId, b.weapon, isHeadshot);
            hits.push({
              x: b.x,
              y: b.y,
              damage: finalDamage,
              isHeadshot: isHeadshot,
              targetId: target.socketId,
              type: 'player'
            });
          }
          bulletConsumed = true;
          break;
        }
      }

      if (!bulletConsumed && b.rangeLeft > 0 && b.x > 0 && b.x < this.map.width && b.y > 0 && b.y < this.map.height) {
        activeBullets.push(b);
      }
    }

    this.bullets = activeBullets;
    return hits;
  }

  explodeRocket(bullet, hits) {
    hits.push({
      x: bullet.x,
      y: bullet.y,
      type: 'explosion',
      radius: bullet.splashRadius
    });

    for (const pid in this.players) {
      const target = this.players[pid];
      if (!target.isAlive) continue;

      const dist = Math.hypot(bullet.x - target.x, bullet.y - target.y);
      if (dist <= bullet.splashRadius) {
        const falloff = 1 - (dist / bullet.splashRadius);
        const damage = Math.round(bullet.damage * Math.max(0.3, falloff));
        this.applyDamage(target, damage, bullet.shooterId, 'rocket', false);
      }
    }
  }

  applyDamage(target, amount, attackerId, weaponKey, isHeadshot) {
    const attacker = this.players[attackerId];
    if (attacker) attacker.damage = (attacker.damage || 0) + amount;

    // Damage shield first
    if (target.shield > 0) {
      if (target.shield >= amount) {
        target.shield -= amount;
        amount = 0;
      } else {
        amount -= target.shield;
        target.shield = 0;
      }
    }

    target.health -= amount;

    if (target.health <= 0) {
      target.health = 0;
      target.isAlive = false;
      target.deaths++;
      target.respawnTimer = 120; // 3 seconds at 40hz

      if (attacker) {
        attacker.kills++;
        attacker.score += isHeadshot ? 150 : 100;
        if (isHeadshot) attacker.headshots = (attacker.headshots || 0) + 1;

        // Add to killfeed
        const killItem = {
          id: `kill_${Date.now()}_${Math.random()}`,
          killer: attacker.displayName,
          killerId: attacker.socketId,
          victim: target.displayName,
          victimId: target.socketId,
          weapon: weaponKey || 'rifle',
          isHeadshot: !!isHeadshot,
          time: Date.now()
        };
        this.killfeed.unshift(killItem);
        if (this.killfeed.length > 8) this.killfeed.pop();

        // Update database if real user
        if (!attacker.isBot) {
          db.updateUserStats(attacker.id, {
            kills: 1,
            damage: attacker.damage,
            headshots: isHeadshot ? 1 : 0
          });
        }
      }

      if (!target.isBot) {
        db.updateUserStats(target.id, {
          deaths: 1
        });
      }
    }
  }

  respawnPlayer(player) {
    const spawn = this.getRandomSpawn();
    player.x = spawn.x;
    player.y = spawn.y;
    player.health = player.maxHealth;
    player.shield = 50;
    player.isAlive = true;
    player.isReloading = false;
    const w = WEAPONS[player.weapon] || WEAPONS.rifle;
    player.ammo = w.magSize;
  }

  updateBotAI(bot) {
    bot.aiTimer++;

    // Find closest target
    let closestTarget = null;
    let minDist = 900;

    for (const pid in this.players) {
      const p = this.players[pid];
      if (p.socketId === bot.socketId || !p.isAlive) continue;
      const d = Math.hypot(p.x - bot.x, p.y - bot.y);
      if (d < minDist) {
        minDist = d;
        closestTarget = p;
      }
    }

    if (closestTarget) {
      // Aim at target
      const angle = Math.atan2(closestTarget.y - bot.y, closestTarget.x - bot.x);
      bot.rotation = angle;

      // Move toward or circle around target
      let moveAngle = angle;
      if (minDist < 300) {
        // Strafe
        moveAngle += Math.PI / 2;
      }
      const mx = Math.cos(moveAngle);
      const my = Math.sin(moveAngle);
      this.handleInput(bot.socketId, { moveX: mx, moveY: my });

      // Shoot if close enough and line of sight
      if (minDist < 700 && Math.random() < 0.08) {
        this.handleShoot(bot.socketId, { angle: angle, weapon: bot.weapon });
      }
    } else {
      // Random patrol
      if (bot.aiTimer % 90 === 0) {
        bot.rotation += (Math.random() - 0.5) * 1.5;
      }
      const mx = Math.cos(bot.rotation) * 0.6;
      const my = Math.sin(bot.rotation) * 0.6;
      this.handleInput(bot.socketId, { moveX: mx, moveY: my });
    }
  }

  // Get Room snapshot to send over network
  getState() {
    return {
      roomId: this.id,
      tick: this.stateTick,
      players: Object.values(this.players).map(p => ({
        id: p.socketId,
        displayName: p.displayName,
        photoURL: p.photoURL,
        isBot: p.isBot,
        x: Math.round(p.x),
        y: Math.round(p.y),
        rotation: +(p.rotation.toFixed(3)),
        health: p.health,
        maxHealth: p.maxHealth,
        shield: p.shield,
        maxShield: p.maxShield,
        kills: p.kills,
        deaths: p.deaths,
        score: p.score,
        isAlive: p.isAlive,
        respawnTimer: p.respawnTimer,
        weapon: p.weapon,
        ammo: p.ammo,
        isReloading: p.isReloading,
        isDashing: p.isDashing,
        skinColor: p.skinColor,
        isSpeaking: p.isSpeaking,
        quadDamage: p.quadDamageTimer > 0
      })),
      bullets: this.bullets.map(b => ({
        id: b.id,
        x: Math.round(b.x),
        y: Math.round(b.y),
        vx: +(b.vx.toFixed(2)),
        vy: +(b.vy.toFixed(2)),
        weapon: b.weapon,
        color: b.color,
        isRocket: b.isRocket
      })),
      pickups: this.pickups.map(pk => ({
        id: pk.id,
        x: pk.x,
        y: pk.y,
        type: pk.type,
        active: pk.active
      })),
      killfeed: this.killfeed
    };
  }
}

// Room Manager
class RoomManager {
  constructor() {
    this.rooms = {};
    this.initDefaultRooms();
  }

  initDefaultRooms() {
    const defaultServers = [
      { id: 'asia-bkk-1', name: '🇹🇭 Asia - Bangkok Arena #1', region: 'Asia (Bangkok)', mapId: 'cyber_arena', maxPlayers: 12 },
      { id: 'asia-bkk-2', name: '🇹🇭 Asia - Bangkok TDM #2', region: 'Asia (Bangkok)', mapId: 'neon_city', maxPlayers: 10 },
      { id: 'asia-tyo-1', name: '🇯🇵 Asia - Tokyo Cyber #1', region: 'Asia (Tokyo)', mapId: 'cyber_arena', maxPlayers: 10 },
      { id: 'eu-fra-1', name: '🇪🇺 Europe - Frankfurt #1', region: 'Europe (Frankfurt)', mapId: 'cyber_arena', maxPlayers: 8 },
      { id: 'us-west-1', name: '🇺🇸 US West - California #1', region: 'US West', mapId: 'neon_city', maxPlayers: 8 }
    ];

    for (const s of defaultServers) {
      this.rooms[s.id] = new GameRoom(s.id, s);
    }
  }

  getRoom(roomId) {
    return this.rooms[roomId] || null;
  }

  createRoom(options) {
    const id = `room_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 4)}`;
    const room = new GameRoom(id, options);
    this.rooms[id] = room;
    return room;
  }

  getPublicRoomList() {
    return Object.values(this.rooms).map(r => ({
      id: r.id,
      name: r.name,
      region: r.region,
      mapId: r.mapId,
      mapName: r.map.name,
      gameMode: r.gameMode,
      currentPlayers: Object.keys(r.players).length,
      maxPlayers: r.maxPlayers,
      isPrivate: r.isPrivate,
      ping: Math.floor(10 + Math.random() * 25)
    }));
  }
}

module.exports = {
  WEAPONS,
  MAPS,
  roomManager: new RoomManager()
};
