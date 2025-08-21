const authMiddleware = {
  // Check if user is authenticated
  isAuthenticated(req, res, next) {
    // For now, we'll just check if user data exists in session/request
    // In a real app, you'd verify JWT tokens or session data
    if (req.session && req.session.user) {
      return next();
    }
    
    return res.status(401).json({
      success: false,
      message: "Anda harus login terlebih dahulu"
    });
  },

  // Check if user has admin role
  isAdmin(req, res, next) {
    if (req.session && req.session.user && req.session.user.role === 'admin') {
      return next();
    }
    
    return res.status(403).json({
      success: false,
      message: "Akses ditolak. Anda harus memiliki role admin"
    });
  },

  // Check if user has moderator role or higher
  isModerator(req, res, next) {
    if (req.session && req.session.user && 
        (req.session.user.role === 'moderator' || req.session.user.role === 'admin')) {
      return next();
    }
    
    return res.status(403).json({
      success: false,
      message: "Akses ditolak. Anda harus memiliki role moderator atau admin"
    });
  }
};

module.exports = authMiddleware;
