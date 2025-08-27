// controllers/noteController.js
const { Note } = require("../models");

/** Ambil userId dari session/auth kamu */
function getCurrentUserId(req) {
  // sesuaikan dengan cara kamu menyimpan user saat login
  return req?.session?.user?.id || req?.user?.id || req?.userId || null;
}

class NoteController {
  /** GET /api/notes?meetingId=... -> hanya notes milik user saat ini */
  static async listMine(req, res) {
    try {
      const userId = getCurrentUserId(req);
      if (!userId)
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });

      const { meetingId } = req.query;
      if (!meetingId) {
        return res
          .status(400)
          .json({ success: false, message: "meetingId wajib diisi" });
      }

      const rows = await Note.findAll({
        where: { meetingId, userId },
        order: [["updated_at", "DESC"]],
        attributes: [
          "noteId",
          "meetingId",
          "userId",
          "title",
          "contentNote",
          "updated_at",
        ],
      });

      res.json({
        success: true,
        data: rows.map((n) => ({
          id: n.noteId,
          meetingId: n.meetingId,
          userId: n.userId,
          title: n.title,
          body: n.contentNote,
          updatedAt: n.get("updated_at"),
        })),
      });
    } catch (e) {
      console.error("listMine error:", e);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }

  /** GET /api/notes/:id -> detail note milik user */
  static async getMineById(req, res) {
    try {
      const userId = getCurrentUserId(req);
      if (!userId)
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });

      const { id } = req.params;
      const n = await Note.findOne({
        where: { noteId: id, userId },
        attributes: [
          "noteId",
          "meetingId",
          "userId",
          "title",
          "contentNote",
          "updated_at",
        ],
      });
      if (!n)
        return res
          .status(404)
          .json({ success: false, message: "Catatan tidak ditemukan" });

      res.json({
        success: true,
        data: {
          id: n.noteId,
          meetingId: n.meetingId,
          userId: n.userId,
          title: n.title,
          body: n.contentNote,
          updatedAt: n.get("updated_at"),
        },
      });
    } catch (e) {
      console.error("getMineById error:", e);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }

  /** POST /api/notes  {meetingId, title, body} -> buat note (milik user) */
  static async create(req, res) {
    try {
      const userId = getCurrentUserId(req);
      if (!userId)
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });

      const { meetingId, title, body } = req.body;
      if (!meetingId) {
        return res
          .status(400)
          .json({ success: false, message: "meetingId wajib diisi" });
      }

      const created = await Note.create({
        meetingId,
        userId,
        title: (title || "").toString().slice(0, 150),
        contentNote: (body || "").toString(),
      });

      res.json({
        success: true,
        message: "Catatan berhasil dibuat",
        data: {
          id: created.noteId,
          meetingId: created.meetingId,
          userId: created.userId,
          title: created.title,
          body: created.contentNote,
          updatedAt: created.get("updated_at"),
        },
      });
    } catch (e) {
      console.error("create note error:", e);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }

  /** PUT /api/notes/:id  {title?, body?} -> update note milik user */
  static async update(req, res) {
    try {
      const userId = getCurrentUserId(req);
      if (!userId)
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });

      const { id } = req.params;
      const { title, body } = req.body;

      const n = await Note.findOne({ where: { noteId: id, userId } });
      if (!n)
        return res
          .status(404)
          .json({ success: false, message: "Catatan tidak ditemukan" });

      await n.update({
        title: title != null ? title.toString().slice(0, 150) : n.title,
        contentNote: body != null ? body.toString() : n.contentNote,
      });

      res.json({
        success: true,
        message: "Catatan diperbarui",
        data: {
          id: n.noteId,
          meetingId: n.meetingId,
          userId: n.userId,
          title: n.title,
          body: n.contentNote,
          updatedAt: n.get("updated_at"),
        },
      });
    } catch (e) {
      console.error("update note error:", e);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }

  /** DELETE /api/notes/:id -> soft delete note milik user */
  static async remove(req, res) {
    try {
      const userId = getCurrentUserId(req);
      if (!userId)
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });

      const { id } = req.params;
      const n = await Note.findOne({ where: { noteId: id, userId } });
      if (!n)
        return res
          .status(404)
          .json({ success: false, message: "Catatan tidak ditemukan" });

      await n.destroy(); // paranoid -> soft delete
      res.json({ success: true, message: "Catatan dihapus" });
    } catch (e) {
      console.error("remove note error:", e);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }
}

module.exports = NoteController;
