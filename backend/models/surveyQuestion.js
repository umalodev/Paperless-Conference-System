const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const SurveyQuestion = sequelize.define(
    "SurveyQuestion",
    {
      questionId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: "survey_questions_id",
      },
      surveyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "survey_id",
        references: { model: "m_survey", key: "survey_id" },
      },
      typeId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "questions_type_id",
        references: {
          model: "m_survey_type_questions",
          key: "type_questions_id",
        },
      },
      questionBody: {
        type: DataTypes.TEXT,
        allowNull: false,
        field: "question_body",
      },
      isRequired: {
        type: DataTypes.CHAR(1),
        allowNull: false,
        defaultValue: "N",
        validate: { isIn: [["Y", "N"]] },
        field: "is_required",
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
      tableName: "m_survey_questions",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [
        { fields: ["survey_id"] },
        { fields: ["questions_type_id"] },
        { fields: ["flag"] },
      ],
    }
  );

  SurveyQuestion.associate = (models) => {
    SurveyQuestion.belongsTo(models.Survey, {
      foreignKey: "surveyId",
      as: "Survey",
    });

    SurveyQuestion.belongsTo(models.SurveyQuestionType, {
      foreignKey: "typeId",
      as: "Type",
    });

    SurveyQuestion.hasMany(models.SurveyOption, {
      foreignKey: "questionId",
      as: "Options",
      onDelete: "CASCADE",
    });
  };

  return SurveyQuestion;
};
