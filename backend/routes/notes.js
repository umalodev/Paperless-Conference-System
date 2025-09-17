// routes/notes.js
const express = require("express");
const router = express.Router();
const NoteController = require("../controllers/noteController");
const auth = require("../middleware/auth");

router.get("/", auth.isAuthenticated, NoteController.listMine);
router.get("/:id", auth.isAuthenticated, NoteController.getMineById);
router.post("/", auth.isAuthenticated, NoteController.create);
router.put("/:id", auth.isAuthenticated, NoteController.update);
router.delete("/:id", auth.isAuthenticated, NoteController.remove);

module.exports = router;
