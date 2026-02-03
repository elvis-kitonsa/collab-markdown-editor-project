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

  useEffect(() => {
    // Pass the room name to the server when connecting
    // 2. Create the connection ONCE when the component loads
    const newSocket = io("http://localhost:3001", {
      query: { room: roomName },
    });

    setSocket(newSocket);

    newSocket.on("receive-markdown", (data) => {
      setMarkdown(data);
    });

    // 3. Listen for data specifically for this room
    newSocket.on("receive-markdown", (data) => {
      setMarkdown(data);
    });

    // 4. Update user count (using the correct state setter)
    newSocket.on("user-count", (count) => {
      setUserCount(count);
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
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Collab Editor: {roomName}</h1>
        <div className="status-badge">Users Online: {userCount}</div>
      </header>

      <main className="editor-main">
        <textarea className="editor-textarea" value={markdown} onChange={handleTextChange} placeholder="Type markdown..." />

        <div className="editor-preview markdown-body">
          <ReactMarkdown>{markdown}</ReactMarkdown>
        </div>
      </main>
    </div>
  );
}

export default App;
