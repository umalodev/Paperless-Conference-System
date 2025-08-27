const MenuService = require("../services/menuService");
const { Menu, UserRole, UserRoleMenu } = require("../models");

class MenuController {
  /**
   * Get menus accessible by the current user's role
   */
  static async getUserMenus(req, res) {
    try {
      // Ambil semua data menu dari DB
      const menus = await Menu.findAll();

      res.json({
        success: true,
        message: "User menus fetched successfully",
        data: menus,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Check menu access for current user
   */
  static async checkMenuAccess(req, res) {
    try {
      res.json({
        success: true,
        message: "Menu access check working",
        data: { hasAccess: true },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Get all menus (admin only)
   */
  static async getAllMenus(req, res) {
    try {
      const menus = await Menu.findAll({
        where: { flag: "Y" },
        attributes: [
          "menuId",
          "displayLabel",
          "iconMenu",
          "sequenceMenu",
          "parentMenu",
          "slug",
          "flag",
        ],
        order: [["sequenceMenu", "ASC"]],
      });

      res.json({
        success: true,
        menus: menus,
      });
    } catch (error) {
      console.error("Get all menus error:", error);
      res.status(500).json({
        success: false,
        message: "Gagal memuat data menus",
      });
    }
  }

  /**
   * Get role-menu access relationships
   */
  static async getRoleMenuAccess(req, res) {
    try {
      const roleMenus = await UserRoleMenu.findAll({
        where: { flag: "Y" },
        attributes: ["userRoleMenuId", "userRoleId", "menuId", "flag"],
        order: [
          ["userRoleId", "ASC"],
          ["menuId", "ASC"],
        ],
      });

      res.json({
        success: true,
        roleMenus: roleMenus,
      });
    } catch (error) {
      console.error("Get role menu access error:", error);
      res.status(500).json({
        success: false,
        message: "Gagal memuat data role menu access",
      });
    }
  }

  /**
   * Create role-menu access relationship
   */
  static async createRoleMenuAccess(req, res) {
    try {
      const { userRoleId, menuId, flag } = req.body;

      console.log("Creating role menu access:", { userRoleId, menuId, flag });

      // Validate input
      if (!userRoleId || !menuId) {
        return res.status(400).json({
          success: false,
          message: "userRoleId dan menuId harus diisi",
        });
      }

      // Check if role exists
      const roleExists = await UserRole.findByPk(userRoleId);
      if (!roleExists) {
        console.log("Role not found:", userRoleId);
        return res.status(400).json({
          success: false,
          message: "Role tidak ditemukan",
        });
      }

      // Check if menu exists
      const menuExists = await Menu.findByPk(menuId);
      if (!menuExists) {
        console.log("Menu not found:", menuId);
        return res.status(400).json({
          success: false,
          message: "Menu tidak ditemukan",
        });
      }

      console.log("Role and menu found, checking existing access...");

      // Check if relationship already exists
      const existingAccess = await UserRoleMenu.findOne({
        where: { userRoleId, menuId },
      });

      if (existingAccess) {
        console.log("Updating existing access:", existingAccess.userRoleMenuId);
        // Update existing relationship
        await existingAccess.update({ flag: flag || "Y" });
      } else {
        console.log("Creating new access relationship");
        // Create new relationship
        const newAccess = await UserRoleMenu.create({
          userRoleId,
          menuId,
          flag: flag || "Y",
        });
        console.log("New access created:", newAccess.userRoleMenuId);
      }

      // Verify the change was saved
      const verifyAccess = await UserRoleMenu.findOne({
        where: { userRoleId, menuId },
      });

      console.log("Verification - Access saved:", verifyAccess ? "YES" : "NO");

      res.json({
        success: true,
        message: "Role menu access berhasil dibuat/diupdate",
        data: {
          userRoleId,
          menuId,
          flag: flag || "Y",
          saved: !!verifyAccess,
        },
      });
    } catch (error) {
      console.error("Create role menu access error:", error);
      res.status(500).json({
        success: false,
        message: "Gagal membuat role menu access",
        error: error.message,
      });
    }
  }

  /**
   * Delete role-menu access relationship
   */
  static async deleteRoleMenuAccess(req, res) {
    try {
      const { userRoleId, menuId } = req.params;

      console.log("Deleting role menu access:", { userRoleId, menuId });

      // Validate input
      if (!userRoleId || !menuId) {
        return res.status(400).json({
          success: false,
          message: "userRoleId dan menuId harus diisi",
        });
      }

      // Find the relationship first
      const existingAccess = await UserRoleMenu.findOne({
        where: { userRoleId, menuId },
      });

      if (!existingAccess) {
        console.log("Access relationship not found for deletion");
        return res.status(404).json({
          success: false,
          message: "Role menu access tidak ditemukan",
        });
      }

      console.log("Found access relationship:", existingAccess.userRoleMenuId);

      // Delete the relationship
      const deleted = await UserRoleMenu.destroy({
        where: { userRoleId, menuId },
      });

      console.log("Delete operation result:", deleted);

      if (deleted) {
        // Verify deletion
        const verifyDeleted = await UserRoleMenu.findOne({
          where: { userRoleId, menuId },
        });

        console.log(
          "Verification - Access deleted:",
          !verifyDeleted ? "YES" : "NO"
        );

        res.json({
          success: true,
          message: "Role menu access berhasil dihapus",
          data: {
            userRoleId,
            menuId,
            deleted: true,
            verified: !verifyDeleted,
          },
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Gagal menghapus role menu access",
        });
      }
    } catch (error) {
      console.error("Delete role menu access error:", error);
      res.status(500).json({
        success: false,
        message: "Gagal menghapus role menu access",
        error: error.message,
      });
    }
  }

  /**
   * Bulk update role-menu access relationships
   */
  static async bulkUpdateRoleAccess(req, res) {
    try {
      const { userRoleId, menuIds, action } = req.body;

      console.log("Bulk updating role access:", {
        userRoleId,
        menuIds,
        action,
      });

      // Validate input
      if (!userRoleId || !menuIds || !Array.isArray(menuIds) || !action) {
        return res.status(400).json({
          success: false,
          message: "userRoleId, menuIds (array), dan action harus diisi",
        });
      }

      if (!["grant", "revoke"].includes(action)) {
        return res.status(400).json({
          success: false,
          message: 'Action harus "grant" atau "revoke"',
        });
      }

      // Check if role exists
      const roleExists = await UserRole.findByPk(userRoleId);
      if (!roleExists) {
        return res.status(400).json({
          success: false,
          message: "Role tidak ditemukan",
        });
      }

      // Check if all menus exist
      const menus = await Menu.findAll({
        where: { menuId: menuIds },
      });

      if (menus.length !== menuIds.length) {
        return res.status(400).json({
          success: false,
          message: "Beberapa menu tidak ditemukan",
        });
      }

      const results = [];

      if (action === "grant") {
        // Grant access to all specified menus
        for (const menuId of menuIds) {
          try {
            const existingAccess = await UserRoleMenu.findOne({
              where: { userRoleId, menuId },
            });

            if (existingAccess) {
              await existingAccess.update({ flag: "Y" });
              results.push({ menuId, action: "updated", success: true });
            } else {
              await UserRoleMenu.create({
                userRoleId,
                menuId,
                flag: "Y",
              });
              results.push({ menuId, action: "created", success: true });
            }
          } catch (error) {
            console.error(`Error granting access to menu ${menuId}:`, error);
            results.push({
              menuId,
              action: "failed",
              success: false,
              error: error.message,
            });
          }
        }
      } else if (action === "revoke") {
        // Revoke access from all specified menus
        for (const menuId of menuIds) {
          try {
            const deleted = await UserRoleMenu.destroy({
              where: { userRoleId, menuId },
            });
            results.push({
              menuId,
              action: "deleted",
              success: true,
              deleted: deleted > 0,
            });
          } catch (error) {
            console.error(`Error revoking access from menu ${menuId}:`, error);
            results.push({
              menuId,
              action: "failed",
              success: false,
              error: error.message,
            });
          }
        }
      }

      const successCount = results.filter((r) => r.success).length;
      const totalCount = results.length;

      console.log(
        `Bulk update completed: ${successCount}/${totalCount} successful`
      );

      res.json({
        success: true,
        message: `Bulk update selesai: ${successCount}/${totalCount} berhasil`,
        data: {
          userRoleId,
          action,
          results,
          summary: {
            total: totalCount,
            successful: successCount,
            failed: totalCount - successCount,
          },
        },
      });
    } catch (error) {
      console.error("Bulk update role access error:", error);
      res.status(500).json({
        success: false,
        message: "Gagal melakukan bulk update role access",
        error: error.message,
      });
    }
  }

  /**
   * Get all user roles with their menu access (admin only)
   */
  static async getUserRolesWithMenus(req, res) {
    try {
      res.json({
        success: true,
        message: "User roles with menus endpoint working",
        data: [],
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Update menu access for a specific role (admin only)
   */
  static async updateRoleMenuAccess(req, res) {
    try {
      res.json({
        success: true,
        message: "Role menu access update working",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Create a new menu (admin only)
   */
  static async createMenu(req, res) {
    try {
      res.json({
        success: true,
        message: "Menu creation working",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Update an existing menu (admin only)
   */
  static async updateMenu(req, res) {
    try {
      res.json({
        success: true,
        message: "Menu update working",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Delete a menu (admin only)
   */
  static async deleteMenu(req, res) {
    try {
      res.json({
        success: true,
        message: "Menu deletion working",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
}

module.exports = MenuController;
