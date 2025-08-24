const express = require('express');
const cors = require("cors");
const connectToMongo = require('./db');
const http = require('http');
const { Server } = require("socket.io");

connectToMongo();

const app = express();
const port = process.env.PORT || 3000;

// 1. Create an HTTP server from the Express app
const server = http.createServer(app);

// 2. Initialize Socket.IO server and configure CORS
const io = new Server(server, {
  cors: {
    origin: "https://flow-frontend-omega.vercel.app", // IMPORTANT: Change this to your React app's URL
    methods: ["GET", "POST"]
  }
});

// Middleware setup
app.use(cors());
app.use(express.json());

// --- API Routes ---
app.use('/api/auth', require('./routes/auth'));
app.use('/api/projects', require('./routes/proj'));
app.use('/api/tasks', require('./routes/task'));
app.use('/api/chat', require('./routes/chat')); // Ensure your chat API routes are included

// 3. --- Socket.IO Connection Logic ---
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // When a user joins a project chat
  socket.on('join_project', (projectId) => {
    socket.join(projectId);
    console.log(`User ${socket.id} joined project room: ${projectId}`);
  });

  // When a message is sent from a client
  socket.on('send_message', (data) => {
    // Broadcast the message to all clients in that specific project room
    io.to(data.projectId).emit('receive_message', data);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// 4. Use the HTTP server to listen, not the Express app
server.listen(port, () => {
  console.log(`Backend server with real-time chat listening at http://localhost:${port}`);
});
