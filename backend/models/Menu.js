const { DataTypes } = require('sequelize');

module.exports = (sequelize, Sequelize) => {
  const Menu = sequelize.define('Menu', {
    menuId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      field: 'menu_id'
    },
    displayLabel: {
      type: DataTypes.STRING(20),
      allowNull: false, // Changed to false - menu must have a label
      field: 'display_label',
      validate: {
        notEmpty: true,
        len: [1, 20]
      }
    },
    iconMenu: {
      type: DataTypes.STRING(100),
      allowNull: true, // Icon can be null
      field: 'icon_menu'
    },
    sequenceMenu: {
      type: DataTypes.INTEGER,
      allowNull: false, // Changed to false - menu must have sequence
      field: 'sequence_menu',
      validate: {
        min: 1
      }
    },
    parentMenu: {
      type: DataTypes.INTEGER,
      allowNull: true, // Parent can be null for top-level menus
      field: 'parent_menu',
      references: {
        model: 'm_menu',
        key: 'menu_id'
      }
    },
    slug: {
      type: DataTypes.STRING(100),
      allowNull: false, // Changed to false - menu must have slug
      unique: true,
      validate: {
        notEmpty: true,
        len: [1, 100]
      }
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
    tableName: 'm_menu',
    timestamps: false,
    indexes: [
      {
        fields: ['parent_menu']
      },
      {
        fields: ['sequence_menu']
      },
      {
        fields: ['slug'],
        unique: true
      }
    ]
  });

  Menu.associate = (models) => {
    // Self-referencing relationship for parent-child menus
    Menu.belongsTo(Menu, { 
      as: 'parent', 
      foreignKey: 'parentMenu',
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
    Menu.hasMany(Menu, { 
      as: 'children', 
      foreignKey: 'parentMenu',
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
    
    // Many-to-many relationship with UserRole through UserRoleMenu
    Menu.belongsToMany(models.UserRole, {
      through: models.UserRoleMenu,
      foreignKey: 'menuId',
      otherKey: 'userRoleId',
      as: 'userRoles',
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });
  };

  return Menu;
};
