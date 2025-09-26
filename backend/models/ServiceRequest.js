const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const ServiceRequest = sequelize.define(
    "ServiceRequest",
    {
      serviceRequestId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        field: "service_request_id",
      },
      meetingId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "meeting_id",
        comment: "FK ke meetings.meeting_id",
      },
      requesterUserId: {
        type: DataTypes.INTEGER,
        allowNull: false, // NOT NULL
        field: "requester_user_id",
        comment: "User yang membuat request",
      },
      serviceKey: {
        type: DataTypes.STRING(50),
        allowNull: false,
        field: "service_key",
        validate: { notEmpty: true, len: [1, 50] },
      },
      serviceLabel: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: "service_label",
        validate: { notEmpty: true, len: [1, 100] },
      },
      name: {
        type: DataTypes.STRING(50),
        allowNull: false,
        validate: { notEmpty: true, len: [1, 50] },
      },
      priority: {
        type: DataTypes.ENUM("Low", "Normal", "High"),
        allowNull: false,
        defaultValue: "Normal",
      },
      note: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM("pending", "accepted", "done", "cancelled"),
        allowNull: false,
        defaultValue: "pending",
      },
      handledByUserId: {
        type: DataTypes.INTEGER,
        allowNull: true, // NULLABLE
        field: "handled_by_user_id",
      },
      handledAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "handled_at",
      },
      flag: {
        type: DataTypes.CHAR(1),
        allowNull: false,
        defaultValue: "Y",
        validate: { isIn: [["Y", "N"]] },
      },
    },
    {
      tableName: "t_service_request",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [
        { fields: ["meeting_id", "status"] },
        { fields: ["priority"] },
        { fields: ["requester_user_id"] },
        { fields: ["handled_by_user_id"] },
        { fields: ["service_key"] },
      ],
    }
  );

  ServiceRequest.associate = (models) => {
    if (models.Meeting) {
      ServiceRequest.belongsTo(models.Meeting, {
        foreignKey: "meetingId",
        targetKey: "meetingId", // pastikan PK di model Meeting
        as: "meeting",
        onUpdate: "CASCADE",
        onDelete: "CASCADE", // hapus semua request saat meeting dihapus
      });
    }
    if (models.User) {
      // requester: NOT NULL + RESTRICT
      ServiceRequest.belongsTo(models.User, {
        foreignKey: "requesterUserId",
        targetKey: "id",
        as: "requester",
        onUpdate: "CASCADE",
        onDelete: "RESTRICT", // ⬅️ ganti dari SET NULL
      });
      // handler: NULLABLE + SET NULL
      ServiceRequest.belongsTo(models.User, {
        foreignKey: "handledByUserId",
        targetKey: "id",
        as: "handler",
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      });
    }
  };

  return ServiceRequest;
};
