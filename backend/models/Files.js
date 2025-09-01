// models/m_files.js
module.exports = (sequelize, DataTypes) => {
  const File = sequelize.define(
    "File",
    {
      fileId: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        field: "file_id",
      },
      meetingId: {
        type: DataTypes.STRING(64),
        allowNull: false,
        field: "meeting_id",
      },
      uploaderId: {
        type: DataTypes.BIGINT,
        allowNull: false,
        field: "uploader_id",
      },

      originalName: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: "original_name",
      },
      storedName: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: "stored_name",
      },
      mimeType: {
        type: DataTypes.STRING(128),
        allowNull: true,
        field: "mime_type",
      },
      size: { type: DataTypes.BIGINT, allowNull: false, defaultValue: 0 },
      url: { type: DataTypes.STRING(512), allowNull: false }, // public URL ke file
      description: { type: DataTypes.TEXT, allowNull: true },

      flag: {
        type: DataTypes.ENUM("Y", "N"),
        allowNull: false,
        defaultValue: "Y",
      },
    },
    {
      tableName: "m_files",
      underscored: true,
    }
  );

  File.associate = (models) => {
    File.belongsTo(models.User, { as: "Uploader", foreignKey: "uploader_id" });
    // Jika Meeting primary key = meetingId (string):
    File.belongsTo(models.Meeting, {
      as: "Meeting",
      foreignKey: "meeting_id",
      targetKey: "meetingId",
    });
  };

  return File;
};
