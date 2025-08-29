const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Survey = sequelize.define(
    "Survey",
    {
      surveyId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: "survey_id",
      },
      meetingId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "meeting_id",
        references: { model: "meetings", key: "meeting_id" },
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: "title",
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: "description",
      },
      isShow: {
        type: DataTypes.CHAR(1),
        allowNull: false,
        defaultValue: "N",
        validate: { isIn: [["Y", "N"]] },
        field: "is_show",
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
      tableName: "m_survey",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [
        { fields: ["meeting_id"] },
        { fields: ["is_show"] },
        { fields: ["flag"] },
      ],
    }
  );

  Survey.associate = (models) => {
    Survey.belongsTo(models.Meeting, {
      foreignKey: "meetingId",
      as: "Meeting",
    });

    Survey.hasMany(models.SurveyQuestion, {
      foreignKey: "surveyId",
      as: "Questions",
      onDelete: "CASCADE",
    });
  };

  return Survey;
};
