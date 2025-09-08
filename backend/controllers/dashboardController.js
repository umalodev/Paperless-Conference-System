const db = require('../models');
const { User, Meeting, File, MeetingParticipant } = db;

const dashboardController = {
  // Get dashboard statistics
  async getDashboardStats(req, res) {
    try {
      console.log('Getting dashboard stats for user:', req.user?.username);
      
      // Get total users count
      const totalUsers = await User.count();

      // Get active meetings count
      const activeMeetings = await Meeting.count({
        where: { status: 'started' }
      });

      // Get total meetings count
      const totalMeetings = await Meeting.count();

      // Get total files count
      const totalFiles = await File.count();

      // Get recent activities (last 10 activities)
      const recentActivities = await getRecentActivities();

      // Get system status (always online for now)
      const systemStatus = 'online';

      console.log('Dashboard stats:', {
        totalUsers,
        activeMeetings,
        totalMeetings,
        totalFiles,
        recentActivitiesCount: recentActivities.length
      });

      res.json({
        success: true,
        data: {
          totalUsers,
          activeMeetings,
          totalMeetings,
          totalFiles,
          systemStatus,
          recentActivities
        }
      });
    } catch (error) {
      console.error('Get dashboard stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Gagal memuat data dashboard',
        error: error.message
      });
    }
  }
};

// Helper function to get recent activities
async function getRecentActivities() {
  try {
    const activities = [];

    // Get recent user registrations
    const recentUsers = await User.findAll({
      order: [['created_at', 'DESC']],
      limit: 2,
      attributes: ['username', 'created_at']
    });

    recentUsers.forEach(user => {
      activities.push({
        type: 'user_registration',
        icon: '👤',
        text: `New user registered: ${user.username}`,
        time: formatTimeAgo(user.created_at)
      });
    });

    // Get recent meetings
    const recentMeetings = await Meeting.findAll({
      order: [['created_at', 'DESC']],
      limit: 1,
      attributes: ['title', 'status', 'created_at']
    });

    recentMeetings.forEach(meeting => {
      activities.push({
        type: 'meeting_created',
        icon: '📅',
        text: `Meeting created: ${meeting.title}`,
        time: formatTimeAgo(meeting.created_at)
      });
    });

    // Get recent file uploads
    const recentFiles = await File.findAll({
      order: [['created_at', 'DESC']],
      limit: 1,
      include: [{
        model: User,
        as: 'Uploader',
        attributes: ['username']
      }],
      attributes: ['originalName', 'created_at']
    });

    recentFiles.forEach(file => {
      activities.push({
        type: 'file_upload',
        icon: '📁',
        text: `File uploaded: ${file.originalName} by ${file.Uploader?.username || 'Unknown'}`,
        time: formatTimeAgo(file.created_at)
      });
    });

    // Sort all activities by creation time and return top 3
    return activities
      .sort((a, b) => {
        // Extract timestamp from time string for comparison
        const getTimeValue = (timeStr) => {
          if (timeStr.includes('seconds ago')) {
            return parseInt(timeStr) * 1000;
          } else if (timeStr.includes('minute')) {
            return parseInt(timeStr) * 60 * 1000;
          } else if (timeStr.includes('hour')) {
            return parseInt(timeStr) * 60 * 60 * 1000;
          } else if (timeStr.includes('day')) {
            return parseInt(timeStr) * 24 * 60 * 60 * 1000;
          }
          return 0;
        };
        return getTimeValue(a.time) - getTimeValue(b.time);
      })
      .slice(0, 3);

  } catch (error) {
    console.error('Error getting recent activities:', error);
    return [];
  }
}

// Helper function to format time ago
function formatTimeAgo(date) {
  const now = new Date();
  const diffInSeconds = Math.floor((now - new Date(date)) / 1000);
  
  if (diffInSeconds < 60) {
    return `${diffInSeconds} seconds ago`;
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
}

module.exports = dashboardController;
