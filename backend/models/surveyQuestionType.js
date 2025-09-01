const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const SurveyQuestionType = sequelize.define(
    "SurveyQuestionType",
    {
      typeId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: "type_questions_id",
      },
      name: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        field: "type_question_name",
      },
    },
    {
      tableName: "m_survey_type_questions",
      timestamps: false,
    }
  );

  SurveyQuestionType.associate = (models) => {
    // no-op; referenced by SurveyQuestion
  };

  return SurveyQuestionType;
};
