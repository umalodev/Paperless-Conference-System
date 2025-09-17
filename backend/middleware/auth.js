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
      payload = verifyToken(token);
    } catch (e) {
      return res
        .status(401)
        .json({
          success: false,
          message: "Token tidak valid atau kedaluwarsa",
        });
    }

    // (Opsional) tarik user dari DB agar role/flag terbaru
    const user = await User.findByPk(payload.id, {
      include: [{ model: UserRole, as: "UserRole" }],
    });
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "User tidak ditemukan" });
    }

    // simpan ke req.user
    req.user = {
      id: user.id,
      username: user.username,
      role: user.UserRole?.nama || payload.role || "participant",
      // tambah field lain bila perlu
      _record: user, // jika controller butuh akses full instance
    };

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
