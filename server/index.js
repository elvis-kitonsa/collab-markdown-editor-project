const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors()); // Allows our React app to talk to this server

const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // Your React app's URL
    methods: ["GET", "POST"],
  },
});

// 1. Add the variable here (outside the connection block)
let onlineUsers = 0;

io.on("connection", (socket) => {
  // 2. Increment and notify everyone as soon as they connect
  onlineUsers++;
  io.emit("user-count", onlineUsers);
  console.log("A user connected:", socket.id, "Total users:", onlineUsers);

  // Your existing markdown sync logic
  socket.on("edit-markdown", (data) => {
    socket.broadcast.emit("receive-markdown", data);
  });

  // 3. Update the disconnect logic to decrement and notify
  socket.on("disconnect", () => {
    onlineUsers--;
    io.emit("user-count", onlineUsers);
    console.log("User disconnected. Total users:", onlineUsers);
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
