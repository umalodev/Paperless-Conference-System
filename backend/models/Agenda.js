const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Agenda = sequelize.define(
    "Agenda",
    {
      meetingAgendaId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        field: "meeting_agenda_id",
      },
      meetingId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "meeting_id",
        // FK ke "meetings.id" nanti, sekarang cukup INT
      },
      judul: {
        type: DataTypes.STRING(150),
        allowNull: false,
        validate: { notEmpty: true, len: [1, 150] },
      },
      deskripsi: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      startTime: {
        type: DataTypes.DATE,
        allowNull: false,
        field: "start_time",
      },
      endTime: {
        type: DataTypes.DATE,
        allowNull: false,
        field: "end_time",
        validate: {
          isAfterStart() {
            if (
              this.startTime &&
              this.endTime &&
              this.endTime <= this.startTime
            ) {
              throw new Error("end_time harus lebih besar dari start_time");
            }
          },
        },
      },
      seq: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      flag: {
        type: DataTypes.CHAR(1),
        allowNull: false,
        defaultValue: "Y",
        validate: { isIn: [["Y", "N"]] },
      },
    },
    {
      tableName: "m_meeting_agenda",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [
        { fields: ["meeting_id", "seq"] },
        { fields: ["meeting_id", "start_time"] },
      ],
    }
  );

  // Nanti bisa ditambahkan setelah Meeting ada:
  // Agenda.associate = (models) => {
  //   Agenda.belongsTo(models.Meeting, {
  //     foreignKey: 'meetingId',
  //     as: 'meeting',
  //   });
  // };

  return Agenda;
};
