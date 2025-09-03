const express = require('express');
const router = express.Router();
const MenuController = require('../controllers/menuController');
const auth = require('../middleware/auth');

// Simple middleware for testing (temporary)
const simpleAuth = (req, res, next) => {
  // For now, just pass through - we'll implement proper auth later
  next();
};

const adminOnly = (req, res, next) => {
  // For now, just pass through - we'll implement proper role check later
  next();
};

// Public routes (if any)
// router.get('/public/menus', MenuController.getPublicMenus);

// Protected routes - require authentication
router.use(auth.isAuthenticated);

// Get menus for current user
router.get('/user/menus', MenuController.getUserMenus);

// Check menu access for current user
router.get('/check-access/:menuSlug', MenuController.checkMenuAccess);

// Admin routes - require admin role
router.get('/all', adminOnly, MenuController.getAllMenus);
router.get('/roles-with-menus', adminOnly, MenuController.getUserRolesWithMenus);
router.post('/update-role-access', adminOnly, MenuController.updateRoleMenuAccess);
router.post('/create', adminOnly, MenuController.createMenu);
router.put('/:menuId', adminOnly, MenuController.updateMenu);
router.delete('/:menuId', adminOnly, MenuController.deleteMenu);

// New routes for role access management
router.get('/', auth.isAuthenticated, MenuController.getAllMenus);
router.get('/role-access', auth.isAuthenticated, MenuController.getRoleMenuAccess);
router.post('/role-access', auth.isAuthenticated, MenuController.createRoleMenuAccess);
router.delete('/role-access/:userRoleId/:menuId', auth.isAuthenticated, MenuController.deleteRoleMenuAccess);
router.post('/role-access/bulk', auth.isAuthenticated, MenuController.bulkUpdateRoleAccess);

module.exports = router;
