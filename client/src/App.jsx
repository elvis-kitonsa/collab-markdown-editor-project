import ReactMarkdown from "react-markdown";
import "github-markdown-css/github-markdown.css";
import { useState, useEffect } from "react"; //Combined imports
//useEffect - Tell React to send the text to the server whenever it changes
import "./App.css";
import { io } from "socket.io-client";

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
  const [isTyping, setIsTyping] = useState(false); //Adding a state to track who is typing
  const [typingUser, setTypingUser] = useState(""); // Adding a state to track who is typing
  const [isAnotherUserActive, setIsAnotherUserActive] = useState(false); // Adding a state to track if someone else is currently focusing on the editor to trigger the visual change

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
    // Pass the room name to the server when connecting
    // 2. Create the connection ONCE when the component loads
    const newSocket = io("http://localhost:3001", {
      query: { room: roomName },
    });

    setSocket(newSocket);

    // 3. Listen for data specifically for this room
    newSocket.on("receive-markdown", (data) => {
      setMarkdown(data);
    });

    // 4. Update user count (using the correct state setter)
    newSocket.on("user-count", (count) => {
      setUserCount(count);
    });

    // 5. Update the useEffect to listen for the incoming event
    // This will result into a trigger for the user-typing event in which case
    // the typingUser state will be updated and the message will be displayed
    newSocket.on("user-typing", (data) => {
      console.log("RECEIVED TYPING FROM SERVER:", data); // <--- Add this
      setTypingUser(data.username);
      // Auto-hide the message after 2 seconds of no updates
      setTimeout(() => {
        setTypingUser("");
      }, 2000);
    });

    // 6. Update the useEffect to listen for the incoming event which will result into a trigger for the user-focused-editor event
    // in which case the isAnotherUserActive state will be updated
    newSocket.on("user-focused-editor", () => {
      setIsAnotherUserActive(true);
    });

    newSocket.on("user-blurred-editor", () => {
      setIsAnotherUserActive(false);
    });

    // Cleanup on close
    return () => newSocket.disconnect();
  }, [roomName]);
  // [roomName] means that if the roomName in the URL changes, disconnect from the old room and connect to the new one.

  const handleTextChange = (e) => {
    const newValue = e.target.value;
    setMarkdown(newValue);

    // 5. Use the socket from state to send changes
    if (socket) {
      socket.emit("edit-markdown", newValue);
      // Let others know we are typing!
      // (For now, we'll just say "Someone")
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
          <div className="status-badge">Users Online: {userCount}</div>
        </header>

        <main className="editor-main">
          {/* This Column Wrapper is the secret sauce */}
          <div className="editor-column">
            <div className="typing-indicator">{typingUser ? `${typingUser} is typing...` : "\u00A0"}</div>

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
