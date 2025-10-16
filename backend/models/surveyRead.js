// models/m_survey_read.js
const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const SurveyRead = sequelize.define(
    "SurveyRead",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      surveyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "survey_id",
        references: { model: "m_survey", key: "survey_id" },
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
      tableName: "m_survey_reads",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [
        { unique: true, fields: ["survey_id", "user_id"] },
        { fields: ["user_id"] },
      ],
    }
  );

  SurveyRead.associate = (models) => {
    SurveyRead.belongsTo(models.Survey, {
      as: "Survey",
      foreignKey: "survey_id",
      targetKey: "surveyId",
    });
    SurveyRead.belongsTo(models.User, { as: "User", foreignKey: "user_id" });
  };

  return SurveyRead;
};
