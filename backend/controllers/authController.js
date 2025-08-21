const bcrypt = require('bcrypt');
const { User } = require('../models');

const authController = {
  // Login user
  async login(req, res) {
    try {
      const { username, password } = req.body;
      
      // Validate input
      if (!username || !password) {
        return res.status(400).json({ 
          success: false, 
          message: "Username dan password harus diisi" 
        });
      }

      // Find user by username
      const user = await User.findOne({
        where: { username: username }
      });

      if (!user) {
        return res.status(401).json({ 
          success: false, 
          message: "Username atau password salah" 
        });
      }

      // Check password
      const isValidPassword = await bcrypt.compare(password, user.password);
      
      if (!isValidPassword) {
        return res.status(401).json({ 
          success: false, 
          message: "Username atau password salah" 
        });
      }

      // Store user data in session
      req.session.user = {
        id: user.id,
        username: user.username,
        role: user.role
      };

      // Login successful
      res.json({
        success: true,
        message: "Login berhasil",
        user: {
          id: user.id,
          username: user.username,
          role: user.role
        }
      });

    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Terjadi kesalahan server" 
      });
    }
  },

  // Get user info
  async getUser(req, res) {
    try {
      const userId = req.params.id;
      const user = await User.findByPk(userId, {
        attributes: ['id', 'username', 'role', 'created_at']
      });

      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: "User tidak ditemukan" 
        });
      }

      res.json({
        success: true,
        user: user
      });

    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Terjadi kesalahan server" 
      });
    }
  },

  // Logout user
  async logout(req, res) {
    try {
      // For now, just return success
      // In a real app, you might want to invalidate tokens
      res.json({
        success: true,
        message: "Logout berhasil"
      });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Terjadi kesalahan server" 
      });
    }
  }
};

module.exports = authController;
