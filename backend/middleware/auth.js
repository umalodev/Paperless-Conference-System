// middleware/auth.js
const db = require("../models");
const { User, UserRole } = db;
const { verifyToken } = require("../utils/jwt");

async function isAuthenticated(req, res, next) {
  try {
    const auth = req.headers.authorization || "";
    if (!auth.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ success: false, message: "Anda harus login terlebih dahulu" });
    }

    const token = auth.slice(7).trim();
    let payload;
    try {
      payload = verifyToken(token); // => { id, username, role, sid, iat, exp }
    } catch (e) {
      return res.status(401).json({
        success: false,
        message: "Token tidak valid atau kedaluwarsa",
      });
    }

    // Wajib ada sid di token
    if (!payload?.sid || !payload?.id) {
      return res.status(401).json({
        success: false,
        message: "Sesi tidak valid: sid hilang",
      });
    }

    // Ambil user terbaru dari DB
    const user = await User.findByPk(payload.id, {
      include: [{ model: UserRole, as: "UserRole" }],
      attributes: { exclude: ["password"] },
    });
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "User tidak ditemukan" });
    }

    // **Inti anti multi-login**:
    // token ini hanya valid jika sid dari token == current_session_id di DB
    if (user.currentSessionId !== payload.sid) {
      return res.status(401).json({
        success: false,
        message: "Sesi berakhir karena login dari perangkat lain",
      });
    }

    // simpan ke req.user
    req.user = {
      id: user.id,
      username: user.username,
      role: user.UserRole?.nama || payload.role || "participant",
      _record: user, // jika controller butuh instance lengkap
    };
    // (opsional) simpan token mentah kalau perlu di logout
    req.accessToken = token;

    return next();
  } catch (err) {
    console.error("Auth middleware error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
}

function isAdmin(req, res, next) {
  const role = req.user?.role;
  if (role === "admin") return next();
  return res
    .status(403)
    .json({
      success: false,
      message: "Akses ditolak. Anda harus memiliki role admin",
    });
}

function isModerator(req, res, next) {
  const role = req.user?.role;
  if (role === "host" || role === "admin") return next();
  return res
    .status(403)
    .json({
      success: false,
      message: "Akses ditolak. Anda harus memiliki role host atau admin",
    });
}

function requireRole(roleName) {
  return (req, res, next) => {
    const role = req.user?.role;
    if (role === roleName) return next();
    return res
      .status(403)
      .json({
        success: false,
        message: `Akses ditolak. Anda harus memiliki role ${roleName}`,
      });
  };
}

module.exports = { isAuthenticated, isAdmin, isModerator, requireRole };
