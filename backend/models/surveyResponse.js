// models/surveyResponse.js
module.exports = (sequelize, DataTypes) => {
  const SurveyResponse = sequelize.define(
    "SurveyResponse",
    {
      responseId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: "response_id",
      },
      surveyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "survey_id",
      },
      meetingId: {
        type: DataTypes.STRING,
        allowNull: false,
        field: "meeting_id",
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "user_id",
      },
      flag: {
        type: DataTypes.STRING(1),
        allowNull: false,
        defaultValue: "Y",
      },
      submittedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: "submitted_at",
      },
    },
    {
      tableName: "m_survey_responses",
      underscored: true,
    }
  );

  SurveyResponse.associate = (models) => {
    SurveyResponse.belongsTo(models.Survey, {
      foreignKey: "surveyId",
      targetKey: "surveyId",
      as: "Survey",
    });

    SurveyResponse.belongsTo(models.User, {
      foreignKey: "userId",
      as: "User",
    });

    SurveyResponse.hasMany(models.SurveyResponseAnswer, {
      foreignKey: "responseId",
      sourceKey: "responseId",
      as: "Answers",
    });
  };

  return SurveyResponse;
};
