import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
app.use(cors());
const server = http.createServer(app);

// Initialize the Socket.IO server with CORS configuration
const io = new Server(server, {
  cors: {
    origin: "*", // Allow connections from any origin
    methods: ["GET", "POST"]
  }
});

// Use a Map to store rooms and the participants (socket IDs) in each room
// roomId -> Set(socketId)
const rooms = new Map();

// Handle new client connections
io.on("connection", (socket) => {
  let joinedRoom = null;

  // Event handler for when a user wants to join a room
  socket.on("join-room", ({ roomId, username }) => {
    joinedRoom = roomId;

    // Create the room if it doesn't exist
    if (!rooms.has(roomId)) {
        rooms.set(roomId, new Set());
    }
    const peers = rooms.get(roomId);

    // Send the list of existing participants to the new user
    socket.emit("existing-peers", [...peers]);

    // Add the new user to the room and notify other participants
    peers.add(socket.id);
    socket.join(roomId);
    socket.to(roomId).emit("peer-joined", socket.id);

    console.log(`[JOIN] ${socket.id} -> ${roomId} (${username ?? "anon"})`);
  });

  // Relay signaling messages (SDP offers/answers, ICE candidates) between peers
  socket.on("signal", ({ to, data }) => {
    io.to(to).emit("signal", { from: socket.id, data });
  });

  // Clean up when a user leaves or disconnects
  const leaveRoom = () => {
    if (!joinedRoom) return;
    const peers = rooms.get(joinedRoom);
    if (peers) {
      peers.delete(socket.id);
      // If the room is empty, delete it
      if (peers.size === 0) {
        rooms.delete(joinedRoom);
      }
    }
    // Notify remaining participants that a peer has left
    socket.to(joinedRoom).emit("peer-left", socket.id);
    socket.leave(joinedRoom);
    console.log(`[LEAVE] ${socket.id} <- ${joinedRoom}`);
    joinedRoom = null;
  };

  socket.on("leave-room", leaveRoom);
  socket.on("disconnect", leaveRoom);
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Signaling server listening on http://localhost:${PORT}`);
});
