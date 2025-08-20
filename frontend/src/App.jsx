import { useEffect, useState } from "react";
import { API_URL } from "./config.js";

function App() {
  const [notes, setNotes] = useState([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  useEffect(() => {
    fetch(`${API_URL}/api/notes`)
      .then((res) => res.json())
      .then((data) => setNotes(data))
      .catch((err) => console.error("Error fetching notes:", err));
  }, []);

  const addNote = async () => {
    if (!title || !content) return alert("Isi semua field!");

    try {
      const res = await fetch(`${API_URL}/api/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content }),
      });
      const newNote = await res.json();
      setNotes([...notes, newNote]);
      setTitle("");
      setContent("");
    } catch (err) {
      console.error("Error adding note:", err);
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>📒 Notes (MySQL + Express + React + Electron)</h1>

      <div>
        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          type="text"
          placeholder="Content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <button onClick={addNote}>Add Note</button>
      </div>

      {/* List semua notes */}
      <ul>
        {notes.map((note) => (
          <li key={note.id}>
            <strong>{note.title}</strong>: {note.content}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
