// models/materialRead.js
const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const MaterialRead = sequelize.define(
    "MaterialRead",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      materialId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "material_id",
        references: { model: "m_meeting_materials", key: "id" },
        onDelete: "CASCADE",
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "user_id",
      },
      readAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: "read_at",
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "m_meeting_material_reads",
      timestamps: false,
      indexes: [
        { unique: true, fields: ["material_id", "user_id"] },
        { fields: ["user_id"] },
      ],
    }
  );

  MaterialRead.associate = (models) => {
    MaterialRead.belongsTo(models.Materials, {
      foreignKey: "materialId",
      as: "Material",
    });
  };

  return MaterialRead;
};
