// models/Whiteboard.js
const { DataTypes } = require("sequelize");

module.exports = (sequelize, Sequelize) => {
  const Whiteboard = sequelize.define(
    "Whiteboard",
    {
      whiteboardId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        field: "whiteboard_id",
      },
      meetingId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "meeting_id",
        references: { model: "meetings", key: "meeting_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "user_id",
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      title: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      // simpan stroke-state sebagai string JSON agar portable di semua DB
      dataJson: {
        type: DataTypes.TEXT("long"),
        allowNull: true,
        field: "data_json",
      },
      flag: {
        type: DataTypes.CHAR(1),
        allowNull: false,
        defaultValue: "Y",
        validate: { isIn: [["Y", "N"]] },
      },
    },
    {
      tableName: "whiteboards",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [
        { fields: ["meeting_id"] },
        { fields: ["user_id"] },
        // 1 aktif per (meeting,user). Unik secara logika di controller.
      ],
    }
  );

  Whiteboard.associate = (models) => {
    Whiteboard.belongsTo(models.Meeting, {
      foreignKey: "meetingId",
      as: "Meeting",
    });
    Whiteboard.belongsTo(models.User, {
      foreignKey: "userId",
      as: "Owner",
    });
  };

  return Whiteboard;
};
