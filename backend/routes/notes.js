// routes/notes.js
const express = require("express");
const router = express.Router();
const NoteController = require("../controllers/noteController");

router.get("/", NoteController.listMine);
router.get("/:id", NoteController.getMineById);
router.post("/", NoteController.create);
router.put("/:id", NoteController.update);
router.delete("/:id", NoteController.remove);

module.exports = router;
