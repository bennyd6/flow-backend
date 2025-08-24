const express = require('express');
const cors = require("cors");
const connectToMongo = require('./db');
const http = require('http');
const { Server } = require("socket.io");

connectToMongo();

const app = express();
const port = process.env.PORT || 3000;

const server = http.createServer(app);

const allowedOrigins = [
  "https://flow-frontend-omega.vercel.app",
  "http://localhost:5173",
];

const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    methods: ["GET", "POST"]
  }
});

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

// --- Socket.IO Logic for VIDEO (on '/video' Namespace) ---
const videoSocket = io.of("/video");
// Updated rooms map: roomId -> Map(socketId -> username)
const rooms = new Map();

app.set('videoRooms', rooms);

// --- API Routes ---
app.use('/api/auth', require('./routes/auth'));
app.use('/api/projects', require('./routes/proj'));
app.use('/api/tasks', require('./routes/task'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/video', require('./routes/video'));
app.use('/api/github', require('./routes/github'));

// --- Socket.IO Logic for CHAT (Default Namespace) ---
io.on('connection', (socket) => {
  console.log('A user connected for CHAT:', socket.id);

  socket.on('join_project', (projectId) => {
    socket.join(projectId);
    console.log(`User ${socket.id} joined project CHAT room: ${projectId}`);
  });

  socket.on('send_message', (data) => {
    io.to(data.projectId).emit('receive_message', data);
  });

  socket.on('disconnect', () => {
    console.log('Chat user disconnected:', socket.id);
  });
});


videoSocket.on("connection", (socket) => {
  console.log('A user connected for VIDEO:', socket.id);
  let joinedRoom = null;
  let username = 'Anonymous';

  socket.on("join-room", (data) => {
    joinedRoom = data.roomId;
    username = data.username; // Store username

    const wasRoomEmpty = !rooms.has(joinedRoom) || rooms.get(joinedRoom).size === 0;

    if (!rooms.has(joinedRoom)) {
        rooms.set(joinedRoom, new Map());
    }
    const peers = rooms.get(joinedRoom);
    
    // Send list of existing peers with their usernames
    const existingPeers = Array.from(peers.entries()).map(([id, name]) => ({ id, name }));
    socket.emit("existing-peers", existingPeers);

    // Add new user and notify others with username
    peers.set(socket.id, username);
    socket.join(joinedRoom);
    videoSocket.to(joinedRoom).emit("peer-joined", { id: socket.id, name: username });
    
    if (wasRoomEmpty) {
        io.to(joinedRoom).emit("call-status-change", { isActive: true, projectId: joinedRoom });
    }

    console.log(`[VIDEO JOIN] ${socket.id} (${username}) -> ${joinedRoom}`);
  });

  socket.on("signal", ({ to, data }) => {
    videoSocket.to(to).emit("signal", { from: socket.id, data });
  });

  const leaveRoom = () => {
    if (!joinedRoom) return;
    const peers = rooms.get(joinedRoom);
    if (peers) {
      peers.delete(socket.id);
      if (peers.size === 0) {
        rooms.delete(joinedRoom);
        io.to(joinedRoom).emit("call-status-change", { isActive: false, projectId: joinedRoom });
      }
    }
    videoSocket.to(joinedRoom).emit("peer-left", socket.id);
    socket.leave(joinedRoom);
    console.log(`[VIDEO LEAVE] ${socket.id} <- ${joinedRoom}`);
    joinedRoom = null;
  };

  socket.on("leave-room", leaveRoom);
  socket.on("disconnect", leaveRoom);
});


server.listen(port, () => {
  console.log(`Backend server with chat and video listening at http://localhost:${port}`);
});
