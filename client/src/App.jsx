import ReactMarkdown from "react-markdown";
import "github-markdown-css/github-markdown.css";
import { useState, useEffect } from "react"; //Combined imports
//useEffect - Tell React to send the text to the server whenever it changes
import "./App.css";

import { io } from "socket.io-client";

const socket = io("http://localhost:3001");

function App() {
  // This is 'State'. Think of it as a smart variable that
  // tells React to re-render the screen whenever it changes.
  const [markdown, setMarkdown] = useState("# Hello World\nStart typing your markdown here...");

  // 1. PLACE NEW STATE HERE
  const [userCount, setUserCount] = useState(1);

  useEffect(() => {
    socket.on("receive-markdown", (data) => {
      setMarkdown(data);
    });

    // 2. PLACE NEW LISTENER HERE
    socket.on("user-count", (count) => {
      setUserCount(count);
    });

    // Cleanup to prevent memory leaks
    return () => {
      socket.off("receive-markdown");
      socket.off("user-count");
    };
  }, []);

  // Update your onChange to also send data to the server
  const handleTextChange = (e) => {
    const newValue = e.target.value;
    setMarkdown(newValue);
    socket.emit("edit-markdown", newValue);
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Collab Markdown Editor</h1>
        <div className="status-badge">Users Online: {userCount}</div>
      </header>

      <main className="editor-main">
        {/* Left Side: The Input */}
        <textarea className="editor-textarea" value={markdown} onChange={handleTextChange} placeholder="Type markdown..." />

        {/* Right Side: The Preview (Now with Parsing!) */}
        <div className="editor-preview markdown-body">
          <ReactMarkdown>{markdown}</ReactMarkdown>
        </div>
      </main>
    </div>
  );
}

export default App;
