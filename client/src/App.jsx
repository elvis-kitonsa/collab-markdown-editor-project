import ReactMarkdown from "react-markdown";
import "github-markdown-css/github-markdown.css";
import { useState } from "react";
import "./App.css";

function App() {
  // This is 'State'. Think of it as a smart variable that
  // tells React to re-render the screen whenever it changes.
  const [markdown, setMarkdown] = useState("# Hello World\nStart typing your markdown here...");

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Collab Markdown Editor</h1>
        <div className="status-badge">Feature: Static Editor</div>
      </header>

      <main className="editor-main">
        {/* Left Side: The Input */}
        <textarea className="editor-textarea" value={markdown} onChange={(e) => setMarkdown(e.target.value)} placeholder="Type markdown..." />

        {/* Right Side: The Preview (Now with Parsing!) */}
        <div className="editor-preview markdown-body">
          <ReactMarkdown>{markdown}</ReactMarkdown>
        </div>
      </main>
    </div>
  );
}

export default App;
