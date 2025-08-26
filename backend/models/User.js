const { DataTypes } = require('sequelize');

module.exports = (sequelize, Sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    username: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      validate: {
        len: [3, 50],
        notEmpty: true
      }
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [6, 255] // Minimum 6 characters
      }
    },
    userRoleId: {
      type: DataTypes.INTEGER,
      allowNull: false, // Changed to false - user must have a role
      field: 'user_role_id',
      references: {
        model: 'm_user_role',
        key: 'user_role_id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT' // Prevent deleting roles that are in use
    }
  }, {
    tableName: 'users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['user_role_id']
      },
      {
        fields: ['username'],
        unique: true
      }
    ]
  });

  User.associate = (models) => {
    // Many-to-one relationship with UserRole
    User.belongsTo(models.UserRole, {
      foreignKey: 'userRoleId',
      as: 'UserRole',
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    });

    // One-to-many relationship with Meeting
    User.hasMany(models.Meeting, {
      foreignKey: 'userId',
      as: 'Meetings',
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });
  };

  // Add a getter method for role
  User.prototype.getRole = function() {
    return this.UserRole?.nama || 'unknown';
  };

  // Add a setter method for role
  User.prototype.setRole = function(roleName) {
    // This will be handled by the association
    return this;
  };

  return User;
};
