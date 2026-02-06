import ReactMarkdown from "react-markdown";
import "github-markdown-css/github-markdown.css";
import { useState, useEffect } from "react"; //Combined imports
//useEffect - Tell React to send the text to the server whenever it changes
import "./App.css";
import { io } from "socket.io-client";
import Prism from "prismjs";
import "prismjs/themes/prism-tomorrow.css"; // A nice dark theme
import "prismjs/components/prism-markdown"; // Markdown support

// 1. Get room name from URL safely
const path = window.location.pathname.split("/")[1];
const roomName = path && path !== "" ? path : "general";

function App() {
  // This is 'State'. Think of it as a smart variable that
  // tells React to re-render the screen whenever it changes.
  const [markdown, setMarkdown] = useState("Loading...");
  const [userCount, setUserCount] = useState(1);
  const [socket, setSocket] = useState(null); // Added missing socket state
  const [rooms, setRooms] = useState([]); // State to hold room list
  const [typingUser, setTypingUser] = useState(""); // Adding a state to track who is typing
  const [isAnotherUserActive, setIsAnotherUserActive] = useState(false); // Adding a state to track if someone else is currently focusing on the editor to trigger the visual change
  const [isRemoteUserIdle, setIsRemoteUserIdle] = useState(false); // Adding a state to track if the remote user is idle

  // =============================== TOOLBAR LOGIC ===============================
  // Function that takes whatever
  // text is selected in your textarea and wraps it in Markdown symbols (like ** for bold).
  const injectMarkdown = (symbol) => {
    const textarea = document.querySelector(".editor-textarea");
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;

    // Wrap selected text or just insert symbols
    const before = text.substring(0, start);
    const selected = text.substring(start, end);
    const after = text.substring(end);

    const newText = `${before}${symbol}${selected}${symbol}${after}`;

    setMarkdown(newText);
    socket.emit("edit-markdown", newText);

    // Refocus the textarea
    textarea.focus();
  };
  // =============================================================================
  // Fetch rooms from the database
  useEffect(() => {
    fetch("http://localhost:3001/rooms")
      .then((res) => res.json())
      .then((data) => setRooms(data));
  }, []);

  const createNewRoom = () => {
    const name = prompt("Enter new room name:");
    if (name) {
      window.location.href = `/${name.toLowerCase().replace(/\s+/g, "-")}`;
    }
  };

  useEffect(() => {
    const newSocket = io("http://localhost:3001", {
      query: { room: roomName },
    });

    setSocket(newSocket);

    newSocket.on("receive-markdown", (data) => setMarkdown(data));
    newSocket.on("user-count", (count) => setUserCount(count));

    newSocket.on("user-typing", (data) => {
      setTypingUser(data.username);
      setTimeout(() => setTypingUser(""), 2000);
    });

    newSocket.on("user-focused-editor", () => setIsAnotherUserActive(true));
    newSocket.on("user-blurred-editor", () => setIsAnotherUserActive(false));

    // --- IDLE LOGIC ---
    let isCurrentlyIdle = false;
    let idleTimer;

    const resetIdleTimer = () => {
      if (isCurrentlyIdle) {
        newSocket.emit("user-idle", false);
        isCurrentlyIdle = false;
      }
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        newSocket.emit("user-idle", true);
        isCurrentlyIdle = true;
      }, 30000);
    };

    // Initialize listeners
    resetIdleTimer();
    window.addEventListener("mousemove", resetIdleTimer);
    window.addEventListener("keydown", resetIdleTimer);

    newSocket.on("user-status-changed", (data) => {
      setIsRemoteUserIdle(data.status === "idle");
    });

    // Cleanup
    return () => {
      newSocket.disconnect();
      window.removeEventListener("mousemove", resetIdleTimer);
      window.removeEventListener("keydown", resetIdleTimer);
      clearTimeout(idleTimer);
    };
  }, [roomName]); // <--- This was missing!

  const handleTextChange = (e) => {
    const newValue = e.target.value;
    setMarkdown(newValue);

    if (socket) {
      socket.emit("edit-markdown", newValue);
      socket.emit("typing", { username: "Someone" });
    }
  };

  return (
    <div className="app-layout">
      {" "}
      {/* Use app-layout for flexbox */}
      {/* 1. THE SIDEBAR (Missing in your version) */}
      <aside className="sidebar">
        <h3>Rooms</h3>
        <button onClick={createNewRoom} className="new-room-btn">
          + New Room
        </button>
        <ul className="room-list">
          {rooms.map((r) => (
            <li key={r} className={roomName === r ? "active" : ""}>
              <a href={`/${r}`}>{r}</a>
            </li>
          ))}
        </ul>
      </aside>
      {/* 2. THE MAIN CONTENT */}
      <div className="app-container">
        <header className="app-header">
          <h1>Collab Editor: {roomName}</h1>
          <div className="status-badge">
            Users Online: {userCount}
            {/* Updating the "Users Online" badge to show a moon icon if the other user is idle */}
            {isRemoteUserIdle && <span style={{ marginLeft: "10px" }}>🌙 (User Idle)</span>}
          </div>
        </header>

        <main className="editor-main">
          {/* This Column Wrapper is the secret sauce */}
          <div className="editor-column">
            <div className="typing-indicator">{typingUser ? `${typingUser} is typing...` : "\u00A0"}</div>

            {/* NEW TOOLBAR */}
            <div className="editor-toolbar">
              <button onClick={() => injectMarkdown("**")}>
                <b>B</b>
              </button>
              <button onClick={() => injectMarkdown("_")}>
                <i>I</i>
              </button>
              <button onClick={() => injectMarkdown("### ")}>H3</button>
              <button onClick={() => injectMarkdown("[")}>🔗 Link</button>
            </div>

            <textarea className={`editor-textarea ${isAnotherUserActive ? "remote-active" : ""}`} value={markdown} onChange={handleTextChange} onFocus={() => socket.emit("user-focus")} onBlur={() => socket.emit("user-blur")} placeholder="Type markdown..." />
          </div>

          <div className="editor-preview markdown-body">
            <ReactMarkdown>{markdown}</ReactMarkdown>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
