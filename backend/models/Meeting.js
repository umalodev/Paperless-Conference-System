const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Meeting = sequelize.define('Meeting', {
    meetingId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: 'meeting_id'
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'title'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'description'
    },
    startTime: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'start_time'
    },
    endTime: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'end_time'
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'user_id',
      references: {
        model: 'users',
        key: 'id'
      }
    },
    // Room status fields
          status: {
        type: DataTypes.ENUM('started', 'ended', 'scheduled'),
        defaultValue: 'scheduled',
        field: 'status'
      },
    maxParticipants: {
      type: DataTypes.INTEGER,
      defaultValue: 50,
      field: 'max_participants'
    },
    currentParticipants: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'current_participants'
    },
    flag: {
      type: DataTypes.ENUM('Y', 'N'),
      defaultValue: 'Y',
      field: 'flag'
    }
  }, {
    tableName: 'meetings',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  Meeting.associate = (models) => {
    Meeting.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'Host'  // Changed from 'User' to 'Host' to match the controller
    });

    Meeting.hasMany(models.MeetingParticipant, {
      foreignKey: 'meetingId',
      as: 'Participants'
    });

    Meeting.hasMany(models.Materials, {
      foreignKey: 'meetingId',
      as: 'Materials'
    });
  };

  return Meeting;
};
