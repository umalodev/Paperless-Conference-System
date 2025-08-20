const express = require("express");
const cors = require("cors");
const db = require("./db/db");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

app.get("/api/notes", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM notes");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

app.post("/api/notes", async (req, res) => {
  const { title, content } = req.body;
  try {
    const [result] = await db.query(
      "INSERT INTO notes (title, content) VALUES (?, ?)",
      [title, content]
    );
    res.json({ id: result.insertId, title, content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Insert error" });
  }
});

app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
});
