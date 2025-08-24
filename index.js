const express = require('express');
const cors = require("cors");
const connectToMongo = require('./db');
const http = require('http');
const { Server } = require("socket.io");

connectToMongo();

const app = express();
const port = process.env.PORT || 3000;

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "https://flow-frontend-omega.vercel.app", // Your React app's URL
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// --- Socket.IO Logic for VIDEO (on '/video' Namespace) ---
const videoSocket = io.of("/video");
const rooms = new Map();

// Make the 'rooms' map accessible to other parts of the app (like the video route)
app.set('videoRooms', rooms);

// --- API Routes ---
app.use('/api/auth', require('./routes/auth'));
app.use('/api/projects', require('./routes/proj'));
app.use('/api/tasks', require('./routes/task'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/video', require('./routes/video')); // Add the new video route

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

  socket.on("join-room", ({ roomId, username }) => {
    joinedRoom = roomId;
    
    const wasRoomEmpty = !rooms.has(roomId) || rooms.get(roomId).size === 0;

    if (!rooms.has(roomId)) {
        rooms.set(roomId, new Set());
    }
    const peers = rooms.get(roomId);
    socket.emit("existing-peers", [...peers]);
    peers.add(socket.id);
    socket.join(roomId);
    videoSocket.to(roomId).emit("peer-joined", socket.id);
    
    // If the room was empty, a new call has started. Notify the chat clients.
    if (wasRoomEmpty) {
        io.to(roomId).emit("call-status-change", { isActive: true });
    }

    console.log(`[VIDEO JOIN] ${socket.id} -> ${roomId}`);
  });

  socket.on("signal", ({ to, data }) => {
    videoSocket.to(to).emit("signal", { from: socket.id, data });
  });

  const leaveRoom = () => {
    if (!joinedRoom) return;
    const peers = rooms.get(joinedRoom);
    if (peers) {
      peers.delete(socket.id);
      // If the room is now empty, the call has ended.
      if (peers.size === 0) {
        rooms.delete(joinedRoom);
        io.to(joinedRoom).emit("call-status-change", { isActive: false });
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
