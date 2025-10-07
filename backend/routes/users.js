const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const auth = require("../middleware/auth");

// Get all users
router.get("/", auth.isAuthenticated, userController.getAllUsers);

// Get all user roles
router.get("/roles", auth.isAuthenticated, userController.getAllRoles);

// Create new user
router.post("/", auth.isAuthenticated, userController.createUser);

// Update user
router.put("/:id", auth.isAuthenticated, userController.updateUser);

// Delete user
router.delete("/:id", auth.isAuthenticated, userController.deleteUser);

module.exports = router;
