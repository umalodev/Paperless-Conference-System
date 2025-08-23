const { DataTypes } = require('sequelize');

module.exports = (sequelize, Sequelize) => {
  const UserRole = sequelize.define('UserRole', {
    userRoleId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
      field: 'user_role_id'
    },
    nama: {
      type: DataTypes.STRING(20),
      allowNull: false, // Changed to false - role name cannot be null
      unique: true, // Ensure role names are unique
      validate: {
        notEmpty: true,
        len: [1, 20]
      }
    },
    flag: {
      type: DataTypes.CHAR(1),
      allowNull: false, // Changed to false
      defaultValue: 'Y',
      validate: {
        isIn: [['Y', 'N']] // Only allow Y or N
      }
    }
  }, {
    tableName: 'm_user_role',
    timestamps: false
  });

  UserRole.associate = (models) => {
    // Many-to-many relationship with Menu through UserRoleMenu
    UserRole.belongsToMany(models.Menu, {
      through: models.UserRoleMenu,
      foreignKey: 'userRoleId',
      otherKey: 'menuId',
      as: 'menus'
    });

    // One-to-many relationship with User
    UserRole.hasMany(models.User, {
      foreignKey: 'userRoleId',
      as: 'users'
    });
  };

  return UserRole;
};
