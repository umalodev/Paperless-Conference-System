const { User, UserRole } = require('../models');

const authMiddleware = {
  // Check if user is authenticated
  async isAuthenticated(req, res, next) {
    try {
      console.log('Auth middleware - Session:', req.session);
      console.log('Auth middleware - Cookies:', req.headers.cookie);
      console.log('Auth middleware - Authorization header:', req.headers.authorization);
      console.log('Auth middleware - X-User-Id header:', req.headers['x-user-id']);
      
      // First try session-based authentication
      if (req.session && req.session.user) {
        const user = await User.findByPk(req.session.user.id, {
          include: [{
            model: UserRole,
            as: 'UserRole'
          }]
        });
        
        if (user) {
          req.user = user;
          console.log('Auth middleware - User authenticated via session:', user.username);
          return next();
        }
      }
      
      // Then try token-based authentication (for backward compatibility)
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const userId = req.headers['x-user-id'];
        
        if (userId) {
          const user = await User.findByPk(userId, {
            include: [{
              model: UserRole,
              as: 'UserRole'
            }]
          });
          
          if (user) {
            req.user = user;
            console.log('Auth middleware - User authenticated via token:', user.username);
            return next();
          }
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

// Add authenticateToken function for backward compatibility
const authenticateToken = authMiddleware.isAuthenticated;

module.exports = {
  ...authMiddleware,
  authenticateToken
};
