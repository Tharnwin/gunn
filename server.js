const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const { Server } = require('socket.io');

const db = require('./database');
const { roomManager, WEAPONS, MAPS } = require('./gameEngine');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(express.static(path.join(__dirname, '..')));

// ==================== REST APIS ====================

// 1. Google Auth & Player Login / Auto-Registration
app.post('/api/auth/google', (req, res) => {
  try {
    const { googleId, email, displayName, photoURL } = req.body;
    if (!displayName && !email) {
      return res.status(400).json({ error: 'ต้องการข้อมูลชื่อหรืออีเมลจาก Google' });
    }

    const user = db.findOrCreateGoogleUser({
      googleId: googleId || `google_${Date.now()}`,
      email: email || '',
      displayName: displayName || 'Google Striker',
      photoURL: photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${displayName || 'google'}`
    });

    res.json({ success: true, user });
  } catch (err) {
    console.error('Auth error:', err);
    res.status(500).json({ error: 'เข้าสู่ระบบด้วย Google ไม่สำเร็จ' });
  }
});

// 1.1 Register New Account (Manual)
app.post('/api/auth/register', (req, res) => {
  try {
    const { username, email, password, displayName } = req.body;
    const user = db.registerUser({ username, email, password, displayName });
    res.json({ success: true, user, message: 'สมัครสมาชิกสำเร็จ!' });
  } catch (err) {
    res.status(400).json({ error: err.message || 'การสมัครสมาชิกล้มเหลว' });
  }
});

// 1.2 Login with Account (Manual)
app.post('/api/auth/login', (req, res) => {
  try {
    const { usernameOrEmail, password } = req.body;
    const user = db.loginUser({ usernameOrEmail, password });
    res.json({ success: true, user, message: 'เข้าสู่ระบบสำเร็จ!' });
  } catch (err) {
    res.status(400).json({ error: err.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
  }
});

// 1.3 Guest Play One-Click
app.post('/api/auth/guest', (req, res) => {
  try {
    const user = db.createGuestUser();
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: 'ไม่สามารถสร้างผู้เล่นชั่วคราวได้' });
  }
});

// 1.4 Get All Registered Users Database Summary
app.get('/api/auth/users', (req, res) => {
  const users = db.getAllUsersSummary();
  res.json({ totalUsers: users.length, users });
});

// ==================== ADMIN & EXCEL CSV EXPORT APIS ====================

// Export All Users directly to Excel / CSV format (UTF-8 BOM for Excel)
app.get('/api/admin/export-csv', (req, res) => {
  try {
    const csvContent = db.generateCSV();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="cyberstrike_users_${Date.now()}.csv"`);
    res.send(csvContent);
  } catch (err) {
    console.error('CSV export error:', err);
    res.status(500).send('Export failed');
  }
});

// Admin Get Full Users & Statistics
app.get('/api/admin/users', (req, res) => {
  try {
    const users = db.getAllUsersSummary();
    const googleCount = users.filter(u => u.authProvider === 'google').length;
    const manualCount = users.filter(u => u.authProvider === 'manual').length;
    const guestCount = users.filter(u => u.authProvider === 'guest').length;
    const totalKills = users.reduce((sum, u) => sum + (u.kills || 0), 0);
    const totalCoins = users.reduce((sum, u) => sum + (u.coins || 0), 0);

    res.json({
      success: true,
      stats: {
        totalUsers: users.length,
        googleCount,
        manualCount,
        guestCount,
        totalKills,
        totalCoins
      },
      users
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch admin users' });
  }
});

// Admin Delete User
app.delete('/api/admin/users/:id', (req, res) => {
  try {
    const success = db.deleteUser(req.params.id);
    if (success) {
      res.json({ success: true, message: 'ลบผู้เล่นออกจากระบบเรียบร้อย' });
    } else {
      res.status(404).json({ error: 'ไม่พบผู้เล่นที่ต้องการลบ' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Delete failed' });
  }
});

// Admin Grant Reward (Coins/Level)
app.post('/api/admin/users/:id/reward', (req, res) => {
  try {
    const user = db.users[req.params.id];
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { coins, level } = req.body;
    if (coins) user.coins = (user.coins || 0) + parseInt(coins);
    if (level) user.level = parseInt(level);

    db.saveUsers();
    res.json({ success: true, user: db.sanitizeUser(user) });
  } catch (err) {
    res.status(500).json({ error: 'Reward failed' });
  }
});

// 2. Get User Profile & Stats
app.get('/api/profile/:id', (req, res) => {
  const user = db.getUser(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user });
});

// 3. Update User Customization (Skin, Favorite Weapon)
app.post('/api/profile/:id/customize', (req, res) => {
  const user = db.getUser(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const { skinColor, favoriteWeapon, displayName } = req.body;
  if (skinColor) user.skinColor = skinColor;
  if (favoriteWeapon) user.favoriteWeapon = favoriteWeapon;
  if (displayName) user.displayName = displayName;

  db.saveUsers();
  res.json({ success: true, user });
});

// 4. Server Browser & Room List
app.get('/api/servers', (req, res) => {
  const list = roomManager.getPublicRoomList();
  res.json({ servers: list });
});

// 5. Create Custom Room
app.post('/api/servers/create', (req, res) => {
  const { name, region, mapId, maxPlayers, gameMode, password, allowBots } = req.body;
  const room = roomManager.createRoom({
    name: name || 'Custom War Arena',
    region: region || 'Asia (Bangkok)',
    mapId: mapId || 'cyber_arena',
    maxPlayers: parseInt(maxPlayers) || 8,
    gameMode: gameMode || 'Free For All',
    password: password || '',
    allowBots: allowBots !== false
  });

  res.json({ success: true, roomId: room.id, roomName: room.name });
});

// 6. Global Leaderboard
app.get('/api/leaderboard', (req, res) => {
  const leaderboard = db.getLeaderboard();
  res.json({ leaderboard });
});

// 7. Recent Matches
app.get('/api/matches', (req, res) => {
  const matches = db.getRecentMatches();
  res.json({ matches });
});

// 8. Game Config (Weapons, Maps)
app.get('/api/config', (req, res) => {
  res.json({ weapons: WEAPONS, maps: MAPS });
});

// ==================== SOCKET.IO MULTIPLAYER & VOIP ====================

// Track socket to room mapping
const socketRoomMap = new Map();

io.on('connection', (socket) => {
  // Join Room
  socket.on('join-room', (data) => {
    const { roomId, profile } = data;
    const room = roomManager.getRoom(roomId) || roomManager.getRoom('asia-bkk-1');

    if (!room) {
      socket.emit('error-msg', 'Room not found');
      return;
    }

    // Leave current room if in one
    const currentRoomId = socketRoomMap.get(socket.id);
    if (currentRoomId) {
      const prevRoom = roomManager.getRoom(currentRoomId);
      if (prevRoom) {
        prevRoom.removePlayer(socket.id);
        socket.leave(currentRoomId);
        socket.to(currentRoomId).emit('player-left', { socketId: socket.id });
      }
    }

    socket.join(room.id);
    socketRoomMap.set(socket.id, room.id);

    const player = room.addPlayer(socket.id, profile || {});

    // Notify joining player
    socket.emit('room-joined', {
      roomId: room.id,
      roomName: room.name,
      map: room.map,
      you: player,
      weapons: WEAPONS
    });

    // Notify other players in the room
    socket.to(room.id).emit('player-joined', { player });

    // Voice Chat: notify other peers in this room of new voice participant
    socket.to(room.id).emit('voice-peer-joined', { peerId: socket.id });
  });

  // Player Input (Movement, Aim)
  socket.on('player-input', (inputData) => {
    const roomId = socketRoomMap.get(socket.id);
    if (!roomId) return;
    const room = roomManager.getRoom(roomId);
    if (room) {
      room.handleInput(socket.id, inputData);
    }
  });

  // Player Shoot
  socket.on('player-shoot', (shootData) => {
    const roomId = socketRoomMap.get(socket.id);
    if (!roomId) return;
    const room = roomManager.getRoom(roomId);
    if (room) {
      const createdBullets = room.handleShoot(socket.id, shootData);
      if (createdBullets && createdBullets.length > 0) {
        io.to(room.id).emit('bullets-fired', {
          shooterId: socket.id,
          weapon: shootData.weapon,
          bullets: createdBullets
        });
      }
    }
  });

  // Player Reload
  socket.on('player-reload', () => {
    const roomId = socketRoomMap.get(socket.id);
    if (!roomId) return;
    const room = roomManager.getRoom(roomId);
    if (room) {
      room.handleReload(socket.id);
      socket.to(room.id).emit('player-reloading', { socketId: socket.id });
    }
  });

  // Switch Weapon
  socket.on('switch-weapon', (data) => {
    const roomId = socketRoomMap.get(socket.id);
    if (!roomId) return;
    const room = roomManager.getRoom(roomId);
    if (room) {
      room.handleSwitchWeapon(socket.id, data.weapon);
    }
  });

  // Chat Message
  socket.on('send-chat', (data) => {
    const roomId = socketRoomMap.get(socket.id);
    if (!roomId) return;
    const room = roomManager.getRoom(roomId);
    if (room) {
      const player = room.players[socket.id];
      const msg = room.addChatMessage({
        sender: player ? player.displayName : 'Player',
        text: data.text || ''
      });
      io.to(room.id).emit('chat-received', msg);
    }
  });

  // ==================== WEBRTC VOICE CHAT SIGNALING ====================

  socket.on('voice-offer', (data) => {
    // Relay offer to target peer
    io.to(data.target).emit('voice-offer', {
      caller: socket.id,
      offer: data.offer
    });
  });

  socket.on('voice-answer', (data) => {
    // Relay answer to target peer
    io.to(data.target).emit('voice-answer', {
      responder: socket.id,
      answer: data.answer
    });
  });

  socket.on('voice-ice-candidate', (data) => {
    // Relay ICE candidate
    io.to(data.target).emit('voice-ice-candidate', {
      sender: socket.id,
      candidate: data.candidate
    });
  });

  socket.on('voice-speaking', (data) => {
    const roomId = socketRoomMap.get(socket.id);
    if (!roomId) return;
    const room = roomManager.getRoom(roomId);
    if (room && room.players[socket.id]) {
      room.players[socket.id].isSpeaking = !!data.isSpeaking;
      socket.to(room.id).emit('peer-speaking', {
        peerId: socket.id,
        isSpeaking: !!data.isSpeaking,
        volume: data.volume || 0
      });
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    const roomId = socketRoomMap.get(socket.id);
    if (roomId) {
      const room = roomManager.getRoom(roomId);
      if (room) {
        room.removePlayer(socket.id);
        socket.to(roomId).emit('player-left', { socketId: socket.id });
        socket.to(roomId).emit('voice-peer-left', { peerId: socket.id });
      }
      socketRoomMap.delete(socket.id);
    }
  });
});

// ==================== GAME SERVER TICK LOOP (35 Hz) ====================
setInterval(() => {
  for (const roomId in roomManager.rooms) {
    const room = roomManager.rooms[roomId];
    if (Object.keys(room.players).length > 0) {
      const hits = room.update();
      const state = room.getState();

      io.to(room.id).emit('game-state', state);

      if (hits && hits.length > 0) {
        io.to(room.id).emit('game-hits', hits);
      }
    }
  }
}, 1000 / 35);

// Start Server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`🎮 CYBER STRIKE MULTIPLAYER SERVER RUNNING`);
  console.log(`📡 Local URL: http://localhost:${PORT}`);
  console.log(`🌐 Network URL: http://0.0.0.0:${PORT}`);
  console.log(`🎙️ WebRTC Voice Chat: Active`);
  console.log(`💾 JSON Database: Active in /data`);
  console.log(`=======================================================`);
});
