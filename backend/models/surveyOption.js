// models/surveyOption.js
const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const SurveyOption = sequelize.define(
    "SurveyOption",
    {
      optionId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: "survey_options_id",
      },
      questionId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "question_id",
        references: { model: "m_survey_questions", key: "survey_questions_id" },
      },
      optionBody: {
        type: DataTypes.STRING(500),
        allowNull: false,
        field: "options_body",
      },
      seq: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        field: "seq",
      },
      flag: {
        type: DataTypes.CHAR(1),
        allowNull: false,
        defaultValue: "Y",
        validate: { isIn: [["Y", "N"]] },
        field: "flag",
      },
    },
    {
      tableName: "m_survey_options",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [{ fields: ["question_id"] }, { fields: ["flag"] }],
    }
  );

  SurveyOption.associate = (models) => {
    SurveyOption.belongsTo(models.SurveyQuestion, {
      foreignKey: "questionId",
      as: "Question",
    });
  };

  return SurveyOption;
};
