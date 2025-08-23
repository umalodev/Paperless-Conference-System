const { User, UserRole } = require('../models');

const userController = {
  // Get all users
  async getAllUsers(req, res) {
    try {
      const users = await User.findAll({
        include: [{
          model: UserRole,
          as: 'UserRole',
          attributes: ['nama']
        }],
        attributes: ['id', 'username', 'created_at']
      });

      // Transform data to include role and status
      const transformedUsers = users.map(user => ({
        id: user.id,
        username: user.username,
        role: user.UserRole ? user.UserRole.nama : 'unknown',
        status: 'Active' // Default status for now
      }));

      res.json({
        success: true,
        users: transformedUsers
      });
    } catch (error) {
      console.error('Get all users error:', error);
      res.status(500).json({
        success: false,
        message: 'Gagal memuat data users'
      });
    }
  },

  // Create new user
  async createUser(req, res) {
    try {
      const { username, password, userRoleId } = req.body;

      // Validate input
      if (!username || !password || !userRoleId) {
        return res.status(400).json({
          success: false,
          message: 'Username, password, dan role harus diisi'
        });
      }

      // Validate that userRoleId exists
      const roleExists = await UserRole.findByPk(userRoleId);
      if (!roleExists) {
        return res.status(400).json({
          success: false,
          message: 'Role yang dipilih tidak valid'
        });
      }

      // Check if username already exists
      const existingUser = await User.findOne({ where: { username } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Username sudah digunakan'
        });
      }

      // Hash password
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const user = await User.create({
        username,
        password: hashedPassword,
        userRoleId
      });

      // Get user with role information
      const newUser = await User.findByPk(user.id, {
        include: [{
          model: UserRole,
          as: 'UserRole',
          attributes: ['nama']
        }]
      });

      res.json({
        success: true,
        message: 'User berhasil dibuat',
        user: {
          id: newUser.id,
          username: newUser.username,
          role: newUser.UserRole ? newUser.UserRole.nama : 'unknown',
          status: 'Active'
        }
      });
    } catch (error) {
      console.error('Create user error:', error);
      res.status(500).json({
        success: false,
        message: 'Gagal membuat user'
      });
    }
  },

  // Update user
  async updateUser(req, res) {
    try {
      const userId = req.params.id;
      const { username, password, userRoleId } = req.body;

      // Find user
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User tidak ditemukan'
        });
      }

      // Validate userRoleId if provided
      if (userRoleId) {
        const roleExists = await UserRole.findByPk(userRoleId);
        if (!roleExists) {
          return res.status(400).json({
            success: false,
            message: 'Role yang dipilih tidak valid'
          });
        }
      }

      // Check if username already exists (if changing username)
      if (username && username !== user.username) {
        const existingUser = await User.findOne({ where: { username } });
        if (existingUser) {
          return res.status(400).json({
            success: false,
            message: 'Username sudah digunakan'
          });
        }
      }

      // Update user
      const updateData = {};
      if (username) updateData.username = username;
      if (userRoleId) updateData.userRoleId = userRoleId;
      if (password) {
        const bcrypt = require('bcrypt');
        updateData.password = await bcrypt.hash(password, 10);
      }

      await user.update(updateData);

      // Get updated user with role information
      const updatedUser = await User.findByPk(userId, {
        include: [{
          model: UserRole,
          as: 'UserRole',
          attributes: ['nama']
        }]
      });

      res.json({
        success: true,
        message: 'User berhasil diupdate',
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          role: updatedUser.UserRole ? updatedUser.UserRole.nama : 'unknown',
          status: 'Active'
        }
      });
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({
        success: false,
        message: 'Gagal mengupdate user'
      });
    }
  },

  // Delete user
  async deleteUser(req, res) {
    try {
      const userId = req.params.id;

      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User tidak ditemukan'
        });
      }

      await user.destroy();

      res.json({
        success: true,
        message: 'User berhasil dihapus'
      });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({
        success: false,
        message: 'Gagal menghapus user'
      });
    }
  },

  // Get all user roles
  async getAllRoles(req, res) {
    try {
      const roles = await UserRole.findAll({
        where: { flag: 'Y' },
        attributes: ['userRoleId', 'nama', 'flag'],
        order: [['userRoleId', 'ASC']]
      });

      res.json({
        success: true,
        roles: roles
      });
    } catch (error) {
      console.error('Get all roles error:', error);
      res.status(500).json({
        success: false,
        message: 'Gagal memuat data roles'
      });
    }
  }
};

module.exports = userController;
