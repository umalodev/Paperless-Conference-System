// controllers/authController.js
const bcrypt = require("bcrypt");
const axios = require("axios");
const crypto = require("crypto");
const { User, UserRole } = require("../models");
const { signUser } = require("../utils/jwt"); // pakai util yang sudah kamu buat

const CONTROL_SERVER_URL = process.env.CONTROL_SERVER_URL;

const authController = {
  // POST /api/auth/login
  async login(req, res) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: "Username dan password harus diisi",
        });
      }

      // Ambil user + role
      const user = await User.findOne({
        where: { username },
        include: [{ model: UserRole, as: "UserRole", attributes: ["nama"] }],
      });

      if (!user) {
        return res
          .status(401)
          .json({ success: false, message: "Invalid username or password." });
      }

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return res
          .status(401)
          .json({ success: false, message: "Invalid username or password." });
      }

      const sid = crypto.randomUUID();
      await user.update({ currentSessionId: sid });

      // Buat JWT
      const token = signUser({
        id: user.id,
        username: user.username,
        role: user.UserRole?.nama || "participant",
        sid,
      });

      const accountInfo = {
        id: user.id,
        username: user.username,
        role: user.UserRole?.nama || "participant",
      };

      // 🔹 Kirim data login ke Control Server (non-blocking)
      axios
        .post(`${CONTROL_SERVER_URL}/api/control/sync-login`, {
          token,
          account: accountInfo,
        })
        .then(() =>
          console.log(`✅ Synced login: ${user.username} → Control Server`)
        )
        .catch((err) =>
          console.warn("⚠️ Gagal sync ke Control Server:", err.message)
        );

      return res.json({
        success: true,
        message: "Login berhasil",
        data: {
          token,
          user: {
            id: user.id,
            username: user.username,
            role: user.UserRole ? user.UserRole.nama : "participant",
            name: user.name,
            email: user.email,
          },
        },
      });
    } catch (err) {
      console.error("Login error:", err);
      return res
        .status(500)
        .json({ success: false, message: "Terjadi kesalahan server" });
    }
  },

  // GET /api/auth/user/:id  (opsional, biarkan public/authorized sesuai kebutuhan)
  async getUser(req, res) {
    try {
      const userId = req.params.id;
      const user = await User.findByPk(userId, {
        include: [{ model: UserRole, as: "UserRole", attributes: ["nama"] }],
        attributes: ["id", "username", "created_at"],
      });

      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User tidak ditemukan" });
      }

      return res.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          role: user.UserRole?.nama || "participant",
          name: user.name,
          email: user.email,
          created_at: user.created_at,
        },
      });
    } catch (err) {
      console.error("Get user error:", err);
      return res
        .status(500)
        .json({ success: false, message: "Terjadi kesalahan server" });
    }
  },

  // GET /api/auth/me  (protected)
  async getCurrentUser(req, res) {
    try {
      // req.user diisi oleh middleware JWT
      if (!req.user?.id) {
        return res
          .status(401)
          .json({ success: false, message: "User tidak terautentikasi" });
      }

      // Ambil fresh dari DB agar info terbaru
      const user = await User.findByPk(req.user.id, {
        include: [{ model: UserRole, as: "UserRole", attributes: ["nama"] }],
        attributes: ["id", "username", "created_at"],
      });

      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User tidak ditemukan" });
      }

      return res.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          role: user.UserRole?.nama || "participant",
          name: user.name,
          email: user.email,
          created_at: user.created_at,
        },
      });
    } catch (err) {
      console.error("Get current user error:", err);
      return res
        .status(500)
        .json({ success: false, message: "Terjadi kesalahan server" });
    }
  },

  // POST /api/auth/logout  (no-op server-side untuk JWT)
  async logout(_req, res) {
    // FE cukup hapus token dari storage
    try {
      if (_req.user?.id) {
        await User.update(
          { currentSessionId: null },
          { where: { id: _req.user.id } }
        );
      }
    } catch (_) {}
    return res.json({ success: true, message: "Logout berhasil" });
  },
};

module.exports = authController;
