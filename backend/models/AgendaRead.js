const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const AgendaRead = sequelize.define(
    "AgendaRead",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      agendaId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "agenda_id",
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
      tableName: "m_meeting_agenda_reads",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [
        { unique: true, fields: ["agenda_id", "user_id"] },
        { fields: ["user_id"] },
      ],
    }
  );

  return AgendaRead;
};
