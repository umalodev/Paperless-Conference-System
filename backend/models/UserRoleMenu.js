const { DataTypes } = require('sequelize');

module.exports = (sequelize, Sequelize) => {
  const UserRoleMenu = sequelize.define('UserRoleMenu', {
    userRoleMenuId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      field: 'user_role_menu_id'
    },
    userRoleId: {
      type: DataTypes.INTEGER,
      allowNull: false, // Changed to false - must have a role
      field: 'user_role_id',
      references: {
        model: 'm_user_role',
        key: 'user_role_id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    menuId: {
      type: DataTypes.INTEGER,
      allowNull: false, // Changed to false - must have a menu
      field: 'menu_id',
      references: {
        model: 'm_menu',
        key: 'menu_id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    flag: {
      type: DataTypes.CHAR(1),
      allowNull: false, // Changed to false
      defaultValue: 'Y',
      validate: {
        isIn: [['Y', 'N']]
      }
    }
  }, {
    tableName: 'm_user_role_menu',
    timestamps: false,
    indexes: [
      {
        fields: ['user_role_id']
      },
      {
        fields: ['menu_id']
      },
      {
        fields: ['user_role_id', 'menu_id'],
        unique: true // Ensure unique role-menu combinations
      }
    ]
  });

  UserRoleMenu.associate = (models) => {
    // Belongs to UserRole
    UserRoleMenu.belongsTo(models.UserRole, {
      foreignKey: 'userRoleId',
      as: 'userRole'
    });

    // Belongs to Menu
    UserRoleMenu.belongsTo(models.Menu, {
      foreignKey: 'menuId',
      as: 'menu'
    });
  };

  return UserRoleMenu;
};
