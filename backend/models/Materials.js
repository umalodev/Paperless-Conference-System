const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Materials = sequelize.define(
    "Materials",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      path: {
        type: DataTypes.STRING(500),
        allowNull: false,
        validate: { notEmpty: true },
      },
      meetingId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "meeting_id",
        references: {
          model: "meetings",
          key: "meeting_id"
        }
      },
      flag: {
        type: DataTypes.CHAR(1),
        allowNull: false,
        defaultValue: "Y",
        validate: { isIn: [["Y", "N"]] },
      },
    },
    {
      tableName: "m_meeting_materials",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [
        { fields: ["meeting_id"] },
        { fields: ["flag"] },
      ],
    }
  );

  Materials.associate = (models) => {
    Materials.belongsTo(models.Meeting, {
      foreignKey: "meetingId",
      as: "Meeting"
    });
  };

  return Materials;
};
