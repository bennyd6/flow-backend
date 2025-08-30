const express = require('express');
const cors = require("cors");
const cron = require('node-cron');
const axios = require('axios');
const connectToMongo = require('./db');
const http = require('http');
const { Server } = require("socket.io");

connectToMongo();

const app = express();
const port = process.env.PORT || 3000;

const server = http.createServer(app);

// --- CORS Configuration ---
const allowedOrigins = [
  // "https://flow-frontend-omega.vercel.app",
  "http://localhost:5173",
  // "http://localhost:3000"
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('The CORS policy for this site does not allow access from the specified Origin.'));
    }
  },
};

app.use(cors(corsOptions));
app.use(express.json());

const io = new Server(server, { cors: corsOptions });

app.get('/', (req, res) => {
  res.send('Flow backend is alive and running.');
});

const SELF_PING_URL = 'https://flow-backend-ztda.onrender.com';
cron.schedule('*/10 * * * *', async () => {
  try {
    await axios.get(SELF_PING_URL);
    console.log(`[Keep-Alive] Pinged self to prevent sleep at ${new Date().toISOString()}`);
  } catch (err) {
    console.error(`[Keep-Alive] Self-ping failed: ${err.message}`);
  }
});

const rooms = new Map();
app.set('videoRooms', rooms);

app.use('/api/auth', require('./routes/auth'));
app.use('/api/projects', require('./routes/proj'));
app.use('/api/tasks', require('./routes/task'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/video', require('./routes/video'));
app.use('/api/github', require('./routes/github'));

const chatSocket = io.of("/");
const videoSocket = io.of("/video");

chatSocket.on('connection', (socket) => {
  socket.on('join_project', (projectId) => {
    socket.join(projectId);
  });
  socket.on('send_message', (data) => {
    chatSocket.to(data.projectId).emit('receive_message', data);
  });
});

videoSocket.on("connection", (socket) => {
  let joinedRoom = null;
  let username = 'Anonymous';

  socket.on("join-room", (data) => {
    joinedRoom = data.roomId;
    username = data.username;

    if (!rooms.has(joinedRoom)) {
        rooms.set(joinedRoom, new Map());
    }
    const peersInRoom = rooms.get(joinedRoom);
    
    const existingPeers = Array.from(peersInRoom.entries()).map(([id, name]) => ({ id, name }));
    socket.emit("existing-peers", existingPeers);

    peersInRoom.set(socket.id, username);
    socket.join(joinedRoom);

    // CRITICAL FIX: Broadcast to OTHERS in the room, not the sender.
    socket.broadcast.to(joinedRoom).emit("peer-joined", { id: socket.id, name: username });
    
    if (peersInRoom.size === 1) { // If the first person joins
        chatSocket.to(joinedRoom).emit("call-status-change", { isActive: true, projectId: joinedRoom });
    }
  });

  socket.on("signal", ({ to, data }) => {
    videoSocket.to(to).emit("signal", { from: socket.id, name: username, data });
  });

  const leaveRoom = () => {
    if (!joinedRoom) return;
    const peersInRoom = rooms.get(joinedRoom);
    if (peersInRoom) {
      peersInRoom.delete(socket.id);
      if (peersInRoom.size === 0) {
        rooms.delete(joinedRoom);
        chatSocket.to(joinedRoom).emit("call-status-change", { isActive: false, projectId: joinedRoom });
      }
    }
    socket.broadcast.to(joinedRoom).emit("peer-left", socket.id);
    socket.leave(joinedRoom);
    joinedRoom = null;
  };

  socket.on("leave-room", leaveRoom);
  socket.on("disconnect", leaveRoom);
});

server.listen(port, () => {
  console.log(`Backend server with chat and video listening at http://localhost:${port}`);
});

