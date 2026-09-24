const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_PATH = path.join(__dirname, '..', 'data');
const USERS_FILE = path.join(DB_PATH, 'users.json');
const MATCHES_FILE = path.join(DB_PATH, 'matches.json');
const LEADERBOARD_FILE = path.join(DB_PATH, 'leaderboard.json');
const CSV_FILE = path.join(DB_PATH, 'registered_users.csv');

// Ensure data directory exists
if (!fs.existsSync(DB_PATH)) {
  fs.mkdirSync(DB_PATH, { recursive: true });
}

function readJSON(file, defaultValue = {}) {
  try {
    if (fs.existsSync(file)) {
      const data = fs.readFileSync(file, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error(`Error reading ${file}:`, err);
  }
  return defaultValue;
}

function writeJSON(file, data) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error(`Error writing ${file}:`, err);
  }
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(password + '_cyber_salt_2026').digest('hex');
}

class Database {
  constructor() {
    this.users = readJSON(USERS_FILE, {});
    this.matches = readJSON(MATCHES_FILE, []);
    this.leaderboard = readJSON(LEADERBOARD_FILE, []);
    this.exportUsersToCSV();
  }

  // 1. Google One-Click Login & Registration
  findOrCreateGoogleUser(profile) {
    const googleId = profile.googleId || profile.id;
    // Check if user already exists by googleId or email
    let user = Object.values(this.users).find(u => u.googleId === googleId || (profile.email && u.email === profile.email));

    if (!user) {
      const userId = `usr_g_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
      user = {
        id: userId,
        authProvider: 'google',
        googleId: googleId,
        username: profile.email ? profile.email.split('@')[0] : `player_${Math.floor(1000 + Math.random() * 9000)}`,
        email: profile.email || `${googleId}@gmail.com`,
        displayName: profile.displayName || profile.name || 'Google Warrior',
        photoURL: profile.photoURL || profile.picture || `https://api.dicebear.com/7.x/bottts/svg?seed=${googleId}`,
        level: 1,
        xp: 0,
        coins: 500,
        kills: 0,
        deaths: 0,
        headshots: 0,
        wins: 0,
        matchesPlayed: 0,
        damageDealt: 0,
        favoriteWeapon: 'Assault Rifle',
        skinColor: '#00e5ff',
        unlockedWeapons: ['rifle', 'shotgun', 'sniper', 'rocket'],
        createdAt: new Date().toISOString(),
        lastActive: new Date().toISOString()
      };
      this.users[userId] = user;
      this.saveUsers();
      this.updateLeaderboard();
    } else {
      user.lastActive = new Date().toISOString();
      if (profile.photoURL) user.photoURL = profile.photoURL;
      if (profile.displayName && !user.displayName) user.displayName = profile.displayName;
      if (!user.googleId) user.googleId = googleId;
      this.saveUsers();
    }

    return this.sanitizeUser(user);
  }

  // 2. Register New User (Email / Password)
  registerUser({ username, email, password, displayName }) {
    if (!username || !password) {
      throw new Error('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email ? email.trim().toLowerCase() : `${cleanUsername}@player.cyberstrike.io`;

    // Check duplicate
    const exists = Object.values(this.users).some(u => 
      (u.username && u.username.toLowerCase() === cleanUsername) || 
      (u.email && u.email.toLowerCase() === cleanEmail)
    );

    if (exists) {
      throw new Error('ชื่อผู้ใช้นี้หรืออีเมลนี้ถูกใช้งานแล้วในระบบ');
    }

    const userId = `usr_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const user = {
      id: userId,
      authProvider: 'manual',
      username: username.trim(),
      email: cleanEmail,
      passwordHash: hashPassword(password),
      displayName: (displayName || username).trim(),
      photoURL: `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanUsername}`,
      level: 1,
      xp: 0,
      coins: 500,
      kills: 0,
      deaths: 0,
      headshots: 0,
      wins: 0,
      matchesPlayed: 0,
      damageDealt: 0,
      favoriteWeapon: 'Assault Rifle',
      skinColor: '#00e5ff',
      unlockedWeapons: ['rifle', 'shotgun', 'sniper', 'rocket'],
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString()
    };

    this.users[userId] = user;
    this.saveUsers();
    this.updateLeaderboard();

    return this.sanitizeUser(user);
  }

  // 3. Login with Username/Email & Password
  loginUser({ usernameOrEmail, password }) {
    if (!usernameOrEmail || !password) {
      throw new Error('กรุณากรอกข้อมูลให้ครบถ้วน');
    }

    const identifier = usernameOrEmail.trim().toLowerCase();
    const hash = hashPassword(password);

    const user = Object.values(this.users).find(u => 
      ((u.username && u.username.toLowerCase() === identifier) || 
       (u.email && u.email.toLowerCase() === identifier)) && 
      u.passwordHash === hash
    );

    if (!user) {
      throw new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    }

    user.lastActive = new Date().toISOString();
    this.saveUsers();

    return this.sanitizeUser(user);
  }

  // 4. Guest Login
  createGuestUser() {
    const guestId = `guest_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;
    const guestName = `Striker_${Math.floor(1000 + Math.random() * 9000)}`;

    const user = {
      id: guestId,
      authProvider: 'guest',
      username: guestId,
      email: `${guestId}@guest.local`,
      displayName: guestName,
      photoURL: `https://api.dicebear.com/7.x/bottts/svg?seed=${guestId}`,
      level: 1,
      xp: 0,
      coins: 500,
      kills: 0,
      deaths: 0,
      headshots: 0,
      wins: 0,
      matchesPlayed: 0,
      damageDealt: 0,
      favoriteWeapon: 'Assault Rifle',
      skinColor: '#00e5ff',
      unlockedWeapons: ['rifle', 'shotgun', 'sniper', 'rocket'],
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString()
    };

    this.users[guestId] = user;
    this.saveUsers();
    return this.sanitizeUser(user);
  }

  sanitizeUser(user) {
    if (!user) return null;
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }

  getUser(userId) {
    const u = this.users[userId];
    return this.sanitizeUser(u);
  }

  updateUserStats(userId, stats) {
    const user = this.users[userId];
    if (!user) return null;

    user.kills = (user.kills || 0) + (stats.kills || 0);
    user.deaths = (user.deaths || 0) + (stats.deaths || 0);
    user.headshots = (user.headshots || 0) + (stats.headshots || 0);
    user.damageDealt = (user.damageDealt || 0) + (stats.damage || 0);
    user.matchesPlayed = (user.matchesPlayed || 0) + 1;
    if (stats.won) user.wins = (user.wins || 0) + 1;

    // XP and Level calculation
    const xpGained = (stats.kills || 0) * 100 + (stats.won ? 300 : 100) + Math.floor((stats.damage || 0) / 10);
    user.xp = (user.xp || 0) + xpGained;
    user.coins = (user.coins || 0) + Math.floor(xpGained / 2);

    const newLevel = Math.floor(Math.sqrt(user.xp / 100)) + 1;
    user.level = newLevel;

    this.saveUsers();
    this.updateLeaderboard();
    return this.sanitizeUser(user);
  }

  saveUsers() {
    writeJSON(USERS_FILE, this.users);
    this.exportUsersToCSV();
  }

  // Generate Excel-compatible CSV string with UTF-8 BOM
  generateCSV() {
    const headers = [
      'ลำดับ',
      'User ID',
      'ช่องทางสมัคร (Provider)',
      'ชื่อผู้ใช้ (Username)',
      'ชื่อในเกม (Display Name)',
      'อีเมล (Email)',
      'เลเวล (Level)',
      'เหรียญ (Coins)',
      'Kills',
      'Deaths',
      'K/D Ratio',
      'Headshots',
      'ชัยชนะ (Wins)',
      'จำนวนแมตช์ (Matches)',
      'ดาเมจรวม (Damage)',
      'วันที่สมัคร (Created At)',
      'ใช้งานล่าสุด (Last Active)'
    ];

    const rows = [headers.join(',')];
    const userList = Object.values(this.users);

    userList.forEach((u, idx) => {
      const kd = u.deaths > 0 ? (u.kills / u.deaths).toFixed(2) : (u.kills || 0).toFixed(2);
      const escapeCSV = (str) => `"${String(str || '').replace(/"/g, '""')}"`;

      const row = [
        idx + 1,
        escapeCSV(u.id),
        escapeCSV(u.authProvider || 'manual'),
        escapeCSV(u.username || '-'),
        escapeCSV(u.displayName || '-'),
        escapeCSV(u.email || '-'),
        u.level || 1,
        u.coins || 0,
        u.kills || 0,
        u.deaths || 0,
        kd,
        u.headshots || 0,
        u.wins || 0,
        u.matchesPlayed || 0,
        u.damageDealt || 0,
        escapeCSV(u.createdAt ? new Date(u.createdAt).toLocaleString('th-TH') : '-'),
        escapeCSV(u.lastActive ? new Date(u.lastActive).toLocaleString('th-TH') : '-')
      ];
      rows.push(row.join(','));
    });

    // \uFEFF is UTF-8 Byte Order Mark for Microsoft Excel compatibility
    return '\uFEFF' + rows.join('\r\n');
  }

  exportUsersToCSV() {
    try {
      const csvData = this.generateCSV();
      fs.writeFileSync(CSV_FILE, csvData, 'utf8');
    } catch (e) {
      console.error('Failed to export CSV:', e);
    }
  }

  deleteUser(userId) {
    if (this.users[userId]) {
      delete this.users[userId];
      this.saveUsers();
      this.updateLeaderboard();
      return true;
    }
    return false;
  }

  recordMatch(matchData) {
    const match = {
      id: `match_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date().toISOString(),
      serverRegion: matchData.serverRegion || 'Asia (Bangkok)',
      roomName: matchData.roomName || 'Cyber Arena',
      gameMode: matchData.gameMode || 'Free For All',
      durationSeconds: matchData.durationSeconds || 180,
      playersCount: matchData.playersCount || 1,
      winner: matchData.winner || 'Unknown',
      topScores: matchData.topScores || []
    };

    this.matches.unshift(match);
    if (this.matches.length > 50) {
      this.matches = this.matches.slice(0, 50);
    }
    writeJSON(MATCHES_FILE, this.matches);
    return match;
  }

  updateLeaderboard() {
    const userList = Object.values(this.users);
    const sorted = userList.map(u => {
      const kd = u.deaths > 0 ? (u.kills / u.deaths).toFixed(2) : (u.kills || 0).toFixed(2);
      return {
        id: u.id,
        displayName: u.displayName,
        photoURL: u.photoURL,
        level: u.level || 1,
        kills: u.kills || 0,
        deaths: u.deaths || 0,
        wins: u.wins || 0,
        kdRatio: parseFloat(kd),
        matchesPlayed: u.matchesPlayed || 0
      };
    }).sort((a, b) => b.kills - a.kills || b.kdRatio - a.kdRatio);

    this.leaderboard = sorted.slice(0, 20);
    writeJSON(LEADERBOARD_FILE, this.leaderboard);
  }

  getLeaderboard() {
    if (!this.leaderboard || this.leaderboard.length === 0) {
      this.updateLeaderboard();
    }
    return this.leaderboard;
  }

  getRecentMatches() {
    return this.matches.slice(0, 10);
  }

  getAllUsersSummary() {
    return Object.values(this.users).map(u => this.sanitizeUser(u));
  }
}

module.exports = new Database();
