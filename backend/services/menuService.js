const { Menu, UserRole, UserRoleMenu, User } = require('../models');

class MenuService {
  /**
   * Get all menus accessible by a specific user role
   * @param {number} userRoleId - The user role ID
   * @returns {Promise<Array>} Array of accessible menus
   */
  static async getMenusByUserRole(userRoleId) {
    try {
      const menus = await Menu.findAll({
        include: [
          {
            model: UserRole,
            as: 'userRoles',
            where: { userRoleId: userRoleId },
            through: {
              where: { flag: 'Y' }
            },
            required: true
          }
        ],
        where: { flag: 'Y' },
        order: [['sequenceMenu', 'ASC']]
      });

      return menus;
    } catch (error) {
      console.error('Error getting menus by user role:', error);
      throw error;
    }
  }

  /**
   * Get all menus with their hierarchy (parent-child relationships)
   * @param {number} userRoleId - The user role ID
   * @returns {Promise<Array>} Array of menus with hierarchy
   */
  static async getMenuHierarchyByUserRole(userRoleId) {
    try {
      const allMenus = await this.getMenusByUserRole(userRoleId);
      
      // Build hierarchy
      const menuMap = new Map();
      const rootMenus = [];

      // First pass: create map of all menus
      allMenus.forEach(menu => {
        menuMap.set(menu.menuId, {
          ...menu.toJSON(),
          children: []
        });
      });

      // Second pass: build hierarchy
      allMenus.forEach(menu => {
        if (menu.parentMenu && menuMap.has(menu.parentMenu)) {
          menuMap.get(menu.parentMenu).children.push(menuMap.get(menu.menuId));
        } else {
          rootMenus.push(menuMap.get(menu.menuId));
        }
      });

      return rootMenus;
    } catch (error) {
      console.error('Error getting menu hierarchy:', error);
      throw error;
    }
  }

  /**
   * Get all available menus (for admin management)
   * @returns {Promise<Array>} Array of all menus
   */
  static async getAllMenus() {
    try {
      const menus = await Menu.findAll({
        where: { flag: 'Y' },
        order: [['sequenceMenu', 'ASC']]
      });

      return menus;
    } catch (error) {
      console.error('Error getting all menus:', error);
      throw error;
    }
  }

  /**
   * Get all user roles with their associated menus
   * @returns {Promise<Array>} Array of user roles with menus
   */
  static async getUserRolesWithMenus() {
    try {
      const userRoles = await UserRole.findAll({
        where: { flag: 'Y' },
        include: [
          {
            model: Menu,
            as: 'menus',
            through: {
              where: { flag: 'Y' }
            }
          }
        ]
      });

      return userRoles;
    } catch (error) {
      console.error('Error getting user roles with menus:', error);
      throw error;
    }
  }

  /**
   * Update menu access for a specific user role
   * @param {number} userRoleId - The user role ID
   * @param {Array} menuIds - Array of menu IDs to grant access to
   * @returns {Promise<boolean>} Success status
   */
  static async updateMenuAccessForRole(userRoleId, menuIds) {
    try {
      // First, disable all existing menu access for this role
      await UserRoleMenu.update(
        { flag: 'N' },
        { where: { userRoleId: userRoleId } }
      );

      // Then, enable access for the specified menus
      for (const menuId of menuIds) {
        await UserRoleMenu.findOrCreate({
          where: { userRoleId: userRoleId, menuId: menuId },
          defaults: { flag: 'Y' }
        });

        // Update existing record if it exists
        await UserRoleMenu.update(
          { flag: 'Y' },
          { where: { userRoleId: userRoleId, menuId: menuId } }
        );
      }

      return true;
    } catch (error) {
      console.error('Error updating menu access for role:', error);
      throw error;
    }
  }

  /**
   * Check if a user has access to a specific menu
   * @param {number} userId - The user ID
   * @param {string} menuSlug - The menu slug to check
   * @returns {Promise<boolean>} Whether user has access
   */
  static async checkUserMenuAccess(userId, menuSlug) {
    try {
      const user = await User.findOne({
        where: { id: userId },
        include: [
          {
            model: UserRole,
            as: 'UserRole',
            include: [
              {
                model: Menu,
                as: 'menus',
                where: { slug: menuSlug, flag: 'Y' },
                through: {
                  where: { flag: 'Y' }
                },
                required: true
              }
            ]
          }
        ]
      });

      return !!user;
    } catch (error) {
      console.error('Error checking user menu access:', error);
      throw error;
    }
  }
}

module.exports = MenuService;
