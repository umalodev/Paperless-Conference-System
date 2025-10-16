// models/m_service_inbox_seen.js
const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const ServiceInboxSeen = sequelize.define(
    "ServiceInboxSeen",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      userId: { type: DataTypes.INTEGER, allowNull: false, field: "user_id" },
      meetingId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "meeting_id",
      },
      lastSeen: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: "last_seen",
      },
      flag: {
        type: DataTypes.CHAR(1),
        allowNull: false,
        defaultValue: "Y",
        validate: { isIn: [["Y", "N"]] },
        field: "flag",
      },
    },
    {
      tableName: "t_service_inbox_seen",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [
        { unique: true, fields: ["user_id", "meeting_id"] },
        { fields: ["meeting_id"] },
      ],
    }
  );

  ServiceInboxSeen.associate = (models) => {
    if (models.User) {
      ServiceInboxSeen.belongsTo(models.User, {
        foreignKey: "user_id",
        as: "User",
      });
    }
    if (models.Meeting) {
      ServiceInboxSeen.belongsTo(models.Meeting, {
        foreignKey: "meeting_id",
        as: "Meeting",
      });
    }
  };

  return ServiceInboxSeen;
};
