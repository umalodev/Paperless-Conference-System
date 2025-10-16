// models/fileRead.js
module.exports = (sequelize, DataTypes) => {
  const FileRead = sequelize.define(
    "FileRead",
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      fileId: {
        type: DataTypes.BIGINT,
        allowNull: false,
        field: "file_id",
        references: { model: "m_files", key: "file_id" },
        onDelete: "CASCADE",
      },
      userId: {
        type: DataTypes.BIGINT,
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
      tableName: "m_file_reads",
      timestamps: false,
      indexes: [
        { unique: true, fields: ["file_id", "user_id"] },
        { fields: ["user_id"] },
      ],
    }
  );

  FileRead.associate = (models) => {
    FileRead.belongsTo(models.File, { foreignKey: "fileId", as: "File" });
  };

  return FileRead;
};
