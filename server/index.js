const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { Pool } = require("pg"); // Import the Postgres tool

const app = express();
app.use(cors()); // Allows our React app to talk to this server

const server = http.createServer(app);

// 1. Set up the Database Connection
const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "collab_editor",
  password: "kitonsa", // <-- Put your Postgres password here
  port: 5432,
});

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:5174"], // Since Vite sometimes jumps between ports if one is busy
    methods: ["GET", "POST"],
  },
});

// VARIABLES (Outside the connection block so they stay persistent)
let onlineUsers = 0; // This variable lives for as long as the server process is running.
//let currentMarkdown = "# Hello World\nStart typing..."; // This is the "Library" copy. We added this at the top so the server has a "brain" to remember the text.

io.on("connection", async (socket) => {
  // User Presence Logic
  onlineUsers++;
  io.emit("user-count", onlineUsers);

  // 2. INITIAL SYNC: Fetch the latest text from the Database
  try {
    const res = await pool.query("SELECT content FROM documents ORDER BY id DESC LIMIT 1");
    const latestContent = res.rows[0]?.content || "# Welcome";
    socket.emit("receive-markdown", latestContent);
  } catch (err) {
    console.error("Database Error on connect:", err);
  }

  // 2. INITIAL SYNC: Send the "Library" copy to the new user immediately
  // Provides newly logged on user with a copy of the entire document to work with
  //in case the user missed something due to joining late
  //socket.emit("receive-markdown", currentMarkdown);
  //console.log("A user connected:", socket.id, "Total users:", onlineUsers);

  // 3. Update the Database when someone types
  socket.on("edit-markdown", async (data) => {
    //currentMarkdown = data; // UPDATE the "Library" copy so it's fresh for the next person (We make sure that the server updates its own memory before telling everyone else about the change)
    socket.broadcast.emit("receive-markdown", data);

    try {
      // For now, we'll just update the first row to keep it simple
      await pool.query("UPDATE documents SET content = $1 WHERE id = 1", [data]);
    } catch (err) {
      console.error("Database Error on save:", err);
    }
  });

  // 3. Update the disconnect logic to decrement and notify
  socket.on("disconnect", () => {
    onlineUsers--;
    io.emit("user-count", onlineUsers);
    //console.log("User disconnected. Total users:", onlineUsers);
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
