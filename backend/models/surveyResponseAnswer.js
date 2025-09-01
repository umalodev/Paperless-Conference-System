module.exports = (sequelize, DataTypes) => {
  const SurveyResponseAnswer = sequelize.define(
    "SurveyResponseAnswer",
    {
      answerId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: "answer_id",
      },
      responseId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "response_id",
      },
      questionId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "question_id",
      },
      // untuk single-choice
      selectedOptionId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "selected_option_id",
      },
      // untuk checkbox (multi) -> JSON string ['12','15',...]
      selectedOptionIds: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: "selected_option_ids",
      },
      // untuk short_text / paragraph
      answerText: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: "answer_text",
      },
      // untuk date
      answerDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        field: "answer_date",
      },
      flag: {
        type: DataTypes.STRING(1),
        allowNull: false,
        defaultValue: "Y",
      },
    },
    {
      tableName: "m_survey_response_answers",
      underscored: true,
      timestamps: true,
    }
  );

  SurveyResponseAnswer.associate = (models) => {
    SurveyResponseAnswer.belongsTo(models.SurveyResponse, {
      foreignKey: "responseId",
      targetKey: "responseId",
      as: "Response",
    });
    SurveyResponseAnswer.belongsTo(models.SurveyQuestion, {
      foreignKey: "questionId",
      targetKey: "questionId",
      as: "Question",
    });
    SurveyResponseAnswer.belongsTo(models.SurveyOption, {
      foreignKey: "selectedOptionId",
      targetKey: "optionId",
      as: "SelectedOption",
    });
  };

  return SurveyResponseAnswer;
};
