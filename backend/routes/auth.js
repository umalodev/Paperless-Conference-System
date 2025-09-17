// routes/auth.js
const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { isAuthenticated } = require("../middleware/auth");

router.post("/login", authController.login);
router.get("/user/:id", authController.getUser);
router.get("/me", isAuthenticated, authController.getCurrentUser);
router.post("/logout", authController.logout);

module.exports = router;
