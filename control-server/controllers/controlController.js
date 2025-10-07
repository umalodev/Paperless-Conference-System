/**
 * Control Controller
 * Handle participants listing, command execution, and login sync
 */

exports.getParticipants = (req, res) => {
  const list = Object.values(global.participants || {});
  return res.json({
    success: true,
    total: list.length,
    participants: list,
  });
};

/**
 * Send command to target participant
 * @route POST /api/control/command/:action
 * @body { "targetId": "<socketId>" }
 */
exports.sendCommand = (req, res) => {
  const { action } = req.params;
  const { targetId } = req.body;

  if (!targetId || !global.io) {
    return res.status(400).json({
      success: false,
      message: "Target ID missing or Socket.IO not initialized",
    });
  }

  const socket = global.io.sockets.sockets.get(targetId);
  if (!socket) {
    return res.status(404).json({
      success: false,
      message: "Target not connected or unavailable",
    });
  }

  socket.emit("command", action);
  console.log(`⚙️ Sent command '${action}' to ${targetId}`);

  return res.json({
    success: true,
    message: `Command '${action}' sent successfully`,
  });
};

/**
 * Sync login data from backend (triggered after successful user login)
 * @route POST /api/control/sync-login
 * @body { token: "<JWT>", account: { id, username, role, ... } }
 */
exports.syncLogin = (req, res) => {
  const { token, account } = req.body;

  if (!token || !account) {
    return res.status(400).json({
      success: false,
      message: "Data login tidak lengkap",
    });
  }

  // Simpan ke global untuk digunakan saat Electron client register
  global.lastLogin = { token, account, time: new Date() };
  console.log(`🔄 Synced login from backend: ${account.username}`);

  return res.json({
    success: true,
    message: "Login synced successfully",
  });
};
