/**
 * Control Controller
 * Handle participants listing, command execution, and login sync
 */

// ========================== GET PARTICIPANTS ==========================
// controllers/controlController.js
exports.getParticipants = (req, res) => {
  try {
    // Ambil semua peserta dari global
    const all = Object.values(global.participants || {});

    // Ambil daftar ID socket yang masih aktif
    const activeSocketIds = new Set(global.io ? [...global.io.sockets.sockets.keys()] : []);

    // Filter hanya yang masih aktif
    let list = all.filter((p) => activeSocketIds.has(p.id));

    // ===============================
    // 🔢 Urutkan berdasarkan prioritas role
    // ===============================
    const rolePriority = {
      host: 1,
      participant: 2,
      assist: 3,
      admin: 4, // opsional, jika ada
      device: 5,
      other: 99,
    };

    list.sort((a, b) => {
      const roleA = (a.account?.role || "other").toLowerCase();
      const roleB = (b.account?.role || "other").toLowerCase();
      const priorityA = rolePriority[roleA] || 99;
      const priorityB = rolePriority[roleB] || 99;

      // Jika role sama → urutkan berdasarkan hostname
      if (priorityA === priorityB) {
        return (a.hostname || "").localeCompare(b.hostname || "");
      }

      return priorityA - priorityB;
    });

    // ===============================
    // ✅ Kirim respons
    // ===============================
    return res.json({
      success: true,
      total: list.length,
      participants: list,
    });
  } catch (err) {
    console.error("❌ Error getParticipants:", err);
    return res.status(500).json({
      success: false,
      message: "Server error when fetching participants",
    });
  }
};

// ========================== SEND COMMAND ==========================
/**
 * Send command to target participant (or broadcast to all)
 * @route POST /api/control/command/:action
 * @body { "targetId": "<socketId>" | "all" }
 */
exports.sendCommand = (req, res) => {
  const { action } = req.params;
  const { targetId } = req.body;

  if (!global.io) {
    return res.status(500).json({
      success: false,
      message: "Socket.IO not initialized",
    });
  }

  // =========================================================
  // ✅ HANDLE COMMAND ALL
  // =========================================================
  if (targetId === "all") {
    const participants = Object.values(global.participants || {});
    const targets = participants.filter((p) =>
      ["participant", "assist"].includes(p?.account?.role)
    );

    if (targets.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No participant/assist devices connected",
      });
    }

    for (const p of targets) {
      const socket = global.io.sockets.sockets.get(p.id);
      if (socket) {
        socket.emit("command", action);
        console.log(`📢 Broadcast '${action}' → ${p.hostname} (${p.account?.role})`);
      }
    }

    return res.json({
      success: true,
      message: `Command '${action}' sent to all (${targets.length}) participants`,
    });
  }

  // =========================================================
  // ✅ HANDLE COMMAND SINGLE
  // =========================================================
  if (!targetId) {
    return res.status(400).json({
      success: false,
      message: "Target ID missing",
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
  console.log(`⚙️ Sent command '${action}' → ${targetId}`);

  return res.json({
    success: true,
    message: `Command '${action}' sent successfully`,
  });
};

// ======================================================
// 🧩 REGISTER OR UPDATE PARTICIPANT (from Start.jsx)
// ======================================================
exports.registerParticipant = async (req, res) => {
  try {
    const { token, displayName, user, pc } = req.body;
    if (!user || !pc?.hostname) {
      return res.status(400).json({
        success: false,
        message: "Incomplete participant data (user or PC info missing)",
      });
    }

    const { hostname, os } = pc;
    const username = user.username;
    const role = user.role;
    const id = `manual-${Date.now()}`;

    // 🔍 Cari participant dengan hostname atau username sama
    let existingKey = Object.keys(global.participants).find((key) => {
      const p = global.participants[key];
      if (!p) return false;
      return (
        p.hostname?.toLowerCase() === hostname.toLowerCase() ||
        (p.account && p.account.username === username)
      );
    });

    if (existingKey) {
      // 🧩 Update existing participant
      global.participants[existingKey] = {
        ...global.participants[existingKey],
        hostname,
        os,
        account: {
          ...(global.participants[existingKey].account || {}),
          id: user.id,
          username,
          role,
          displayName: displayName || username,
        },
      };

      console.log(`🔁 Updated existing participant (${hostname}) with new displayName '${displayName}'`);
    } else {
      // 🆕 Register baru jika belum ada
      global.participants[id] = {
        id,
        hostname,
        os,
        account: {
          id: user.id,
          username,
          role,
          displayName: displayName || username,
        },
        isLocked: false,
      };
      console.log(`🆕 Added manual participant (${hostname})`);
    }

    // 🔔 Broadcast update ke semua dashboard
    if (global.io) {
      global.io.emit("participants", Object.values(global.participants));
    }

    return res.json({
      success: true,
      message: "Participant registered/updated successfully",
    });
  } catch (err) {
    console.error("❌ Error in registerParticipant:", err);
    return res.status(500).json({
      success: false,
      message: "Server error during registerParticipant",
    });
  }
};
