const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Note = sequelize.define(
    "Note",
    {
      noteId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        field: "note_id",
      },
      meetingId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "meeting_id",
        reference: {
          model: "Meeting",
          key: "meeting_id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "user_id",
        reference: {
          model: "User",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      title: {
        type: DataTypes.STRING(150),
        allowNull: false,
        defaultValue: "",
      },
      contentNote: {
        type: DataTypes.TEXT,
        allowNull: false,
        field: "content_note",
      },
    },
    {
      tableName: "notes",
      timestamps: true,
      paranoid: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      deletedAt: "deleted_at",
      indexes: [
        { fields: ["meeting_id"] },
        { fields: ["user_id"] },
        { fields: ["meeting_id", "user_id"] },
        { fields: ["updated_at"] },
      ],
    }
  );

  Note.associate = (models) => {
    Note.belongsTo(models.Meeting, {
      foreignKey: "meeting_id",
      as: "meeting",
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    });
    Note.belongsTo(models.User, {
      foreignKey: "user_id",
      as: "user",
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    });
  };

  return Note;
};
