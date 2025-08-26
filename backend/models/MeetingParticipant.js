const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MeetingParticipant = sequelize.define('MeetingParticipant', {
    participantId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: 'participant_id'
    },
    meetingId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'meeting_id',
      references: {
        model: 'meetings',
        key: 'meeting_id'
      }
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
    role: {
      type: DataTypes.ENUM('host', 'participant', 'admin'),
      allowNull: false,
      field: 'role'
    },
    status: {
      type: DataTypes.ENUM('joined', 'left', 'kicked'),
      defaultValue: 'joined',
      field: 'status'
    },
    joinTime: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'join_time'
    },
    leaveTime: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'leave_time'
    },
    isAudioEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_audio_enabled'
    },
    isVideoEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_video_enabled'
    },
    isScreenSharing: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_screen_sharing'
    },
    flag: {
      type: DataTypes.ENUM('Y', 'N'),
      defaultValue: 'Y',
      field: 'flag'
    }
  }, {
    tableName: 'meeting_participants',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  MeetingParticipant.associate = (models) => {
    MeetingParticipant.belongsTo(models.Meeting, {
      foreignKey: 'meetingId',
      as: 'Meeting'
    });
    
    MeetingParticipant.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'User'
    });
  };

  return MeetingParticipant;
};
