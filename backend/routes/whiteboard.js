// routes/whiteboard.js
const express = require("express");
const router = express.Router();
const db = require("../models");
const auth = require("../middleware/auth");
const controller = require("../controllers/whiteboardController")(db);

// privat per user
router.get("/", auth.isAuthenticated, controller.getMine); // ?meetingId=
router.post("/", auth.isAuthenticated, controller.upsertMine); // {meetingId, title?, data}
router.patch("/:id", auth.isAuthenticated, controller.updateById); // {title?, data?}
router.post("/clear", auth.isAuthenticated, controller.clearMine); // {meetingId}
router.delete("/:id", auth.isAuthenticated, controller.remove);

module.exports = router;
