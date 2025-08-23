const { User, UserRole } = require('../models');

const authMiddleware = {
  // Check if user is authenticated
  async isAuthenticated(req, res, next) {
    try {
      console.log('Auth middleware - Session:', req.session);
      console.log('Auth middleware - User in session:', req.session?.user);
      
      // For now, we'll just check if user data exists in session/request
      // In a real app, you'd verify JWT tokens or session data
      if (req.session && req.session.user) {
        // Load user with role information
        const user = await User.findByPk(req.session.user.id, {
          include: [{
            model: UserRole,
            as: 'UserRole'
          }]
        });
        
        if (user) {
          req.user = user;
          console.log('Auth middleware - User authenticated:', user.username);
          return next();
        }
      }
      
      console.log('Auth middleware - Authentication failed');
      return res.status(401).json({
        success: false,
        message: "Anda harus login terlebih dahulu"
      });
    } catch (error) {
      console.error('Auth middleware error:', error);
      return res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  },

  // Check if user has admin role
  async isAdmin(req, res, next) {
    try {
      if (req.user && req.user.UserRole && req.user.UserRole.nama === 'admin') {
        return next();
      }
      
      return res.status(403).json({
        success: false,
        message: "Akses ditolak. Anda harus memiliki role admin"
      });
    } catch (error) {
      console.error('Admin check error:', error);
      return res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  },

  // Check if user has moderator role or higher
  async isModerator(req, res, next) {
    try {
      if (req.user && req.user.UserRole && 
          (req.user.UserRole.nama === 'host' || req.user.UserRole.nama === 'admin')) {
        return next();
      }
      
      return res.status(403).json({
        success: false,
        message: "Akses ditolak. Anda harus memiliki role host atau admin"
      });
    } catch (error) {
      console.error('Moderator check error:', error);
      return res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  },

  // Dynamic role checking method
  requireRole(roleName) {
    return async (req, res, next) => {
      try {
        if (req.user && req.user.UserRole && req.user.UserRole.nama === roleName) {
          return next();
        }
        
        return res.status(403).json({
          success: false,
          message: `Akses ditolak. Anda harus memiliki role ${roleName}`
        });
      } catch (error) {
        console.error('Role check error:', error);
        return res.status(500).json({
          success: false,
          message: "Internal server error"
        });
      }
    };
  }
};

module.exports = authMiddleware;
