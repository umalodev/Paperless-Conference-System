const bcrypt = require('bcrypt');
const { User, UserRole } = require('../models');

const authController = {
  // Login user
  async login(req, res) {
    try {
      const { username, password } = req.body;
      
      console.log('Login attempt for username:', username);
      console.log('Session before login:', req.session);
      
      // Validate input
      if (!username || !password) {
        return res.status(400).json({ 
          success: false, 
          message: "Username dan password harus diisi" 
        });
      }

      // Find user by username with role information
      const user = await User.findOne({
        where: { username: username },
        include: [{
          model: UserRole,
          as: 'UserRole',
          attributes: ['nama']
        }]
      });

      if (!user) {
        console.log('User not found:', username);
        return res.status(401).json({ 
          success: false, 
          message: "Username atau password salah" 
        });
      }

      // Check password
      const isValidPassword = await bcrypt.compare(password, user.password);
      
      if (!isValidPassword) {
        console.log('Invalid password for user:', username);
        return res.status(401).json({ 
          success: false, 
          message: "Username atau password salah" 
        });
      }

      // Store user data in session
      req.session.user = {
        id: user.id,
        username: user.username,
        role: user.UserRole ? user.UserRole.nama : 'unknown'
      };
      
      console.log('Session after setting user:', req.session);
      console.log('User data stored in session:', req.session.user);

      // Login successful
      res.json({
        success: true,
        message: "Login berhasil",
        user: {
          id: user.id,
          username: user.username,
          role: user.UserRole ? user.UserRole.nama : 'unknown'
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
        include: [{
          model: UserRole,
          as: 'UserRole',
          attributes: ['nama']
        }],
        attributes: ['id', 'username', 'created_at']
      });

      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: "User tidak ditemukan" 
        });
      }

      res.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          role: user.UserRole ? user.UserRole.nama : 'unknown',
          created_at: user.created_at
        }
      });

    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Terjadi kesalahan server" 
      });
    }
  },

  // Get current authenticated user
  async getCurrentUser(req, res) {
    try {
      if (!req.session || !req.session.user) {
        return res.status(401).json({
          success: false,
          message: "User tidak terautentikasi"
        });
      }

      const user = await User.findByPk(req.session.user.id, {
        include: [{
          model: UserRole,
          as: 'UserRole',
          attributes: ['nama']
        }],
        attributes: ['id', 'username', 'created_at']
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User tidak ditemukan"
        });
      }

      res.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          role: user.UserRole ? user.UserRole.nama : 'unknown',
          created_at: user.created_at
        }
      });

    } catch (error) {
      console.error("Get current user error:", error);
      res.status(500).json({
        success: false,
        message: "Terjadi kesalahan server"
      });
    }
  },

  // Logout user
  async logout(req, res) {
    try {
      // Destroy session
      if (req.session) {
        req.session.destroy((err) => {
          if (err) {
            console.error('Error destroying session:', err);
            return res.status(500).json({
              success: false,
              message: "Gagal logout"
            });
          }
          
          res.json({
            success: true,
            message: "Logout berhasil"
          });
        });
      } else {
        res.json({
          success: true,
          message: "Logout berhasil"
        });
      }
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
