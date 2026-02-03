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
  // Get the room from the handshake (we will set this up in React next)
  const room = socket.handshake.query.room || "general";
  socket.join(room);

  onlineUsers++;
  io.emit("user-count", onlineUsers);

  // 1. INITIAL SYNC: Fetch content for THIS specific room
  try {
    const res = await pool.query("SELECT content FROM documents WHERE room_id = $1", [room]);

    if (res.rows.length > 0) {
      socket.emit("receive-markdown", res.rows[0].content);
    } else {
      // If room doesn't exist, create it with a welcome message
      const welcomeText = `# Welcome to Room: ${room}`;
      await pool.query("INSERT INTO documents (room_id, content) VALUES ($1, $2)", [room, welcomeText]);
      socket.emit("receive-markdown", welcomeText);
    }
  } catch (err) {
    console.error("Database Error on connect:", err);
  }

  // 2. Update the Database for THIS room only
  socket.on("edit-markdown", async (data) => {
    // Only send to others in the SAME room
    socket.to(room).emit("receive-markdown", data);

    try {
      await pool.query("UPDATE documents SET content = $1 WHERE room_id = $2", [data, room]);
    } catch (err) {
      console.error("Database Error on save:", err);
    }
  });

  socket.on("disconnect", () => {
    onlineUsers--;
    io.emit("user-count", onlineUsers);
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
