const db = require("./db/db");

async function migrate() {
  try {
    await db.getConnection();
    console.log("Koneksi ke database berhasil!");

    await db.query(
      `CREATE TABLE IF NOT EXISTS notes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
    );
    console.log("✅ Notes table created");
  } catch (error) {
    console.error("Error migrating database:", error);
  }
}

migrate();
