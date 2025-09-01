const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MeetingChat = sequelize.define('MeetingChat', {
    meetingChatId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: 'meeting_chat_id'
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
    userReceiveId: {
      type: DataTypes.INTEGER,
      allowNull: true, // NULL untuk group chat, ada value untuk private chat
      field: 'user_receive_id',
      references: {
        model: 'users',
        key: 'id'
      }
    },
    textMessage: {
      type: DataTypes.TEXT,
      allowNull: true, // NULL jika hanya file message
      field: 'text_message'
    },
    fileMessage: {
      type: DataTypes.BLOB,
      allowNull: true, // NULL jika hanya text message
      field: 'file_message'
    },
    originalName: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'original_name'
    },
    filePath: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'file_path'
    },
    mimeType: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'mime_type'
    },
    messageType: {
      type: DataTypes.ENUM('text', 'file', 'image', 'system'),
      defaultValue: 'text',
      field: 'message_type'
    },
    sendTime: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'send_time'
    },
    flag: {
      type: DataTypes.ENUM('Y', 'N'),
      defaultValue: 'Y',
      field: 'flag'
    }
  }, {
    tableName: 'meeting_chat',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['meeting_id']
      },
      {
        fields: ['user_id']
      },
      {
        fields: ['user_receive_id']
      },
      {
        fields: ['send_time']
      },
      {
        fields: ['meeting_id', 'send_time']
      }
    ]
  });

  MeetingChat.associate = (models) => {
    // Many-to-one relationship with Meeting
    MeetingChat.belongsTo(models.Meeting, {
      foreignKey: 'meetingId',
      as: 'Meeting',
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });

    // Many-to-one relationship with User (sender)
    MeetingChat.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'Sender',
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });

    // Many-to-one relationship with User (receiver) - optional for private chat
    MeetingChat.belongsTo(models.User, {
      foreignKey: 'userReceiveId',
      as: 'Receiver',
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });
  };

  return MeetingChat;
};
