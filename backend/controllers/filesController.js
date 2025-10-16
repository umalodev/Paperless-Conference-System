// controllers/filesController.js
const path = require("path");
const fs = require("fs/promises");
const { Op } = require("sequelize");

module.exports = (models, opts = {}) => {
  const { File, User, Meeting, FileRead } = models;
  const uploadBaseUrl = opts.uploadBaseUrl || "/uploads/files";

  const sanitize = (row) => ({
    fileId: row.fileId,
    meetingId: row.meetingId,
    name: row.originalName,
    url: row.url,
    size: row.size,
    mimeType: row.mimeType,
    description: row.description,
    uploaderId: row.uploaderId,
    uploaderName: row.Uploader?.username || row.Uploader?.nama || "User",
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });

  return {
    // GET /api/files?meetingId=...
    list: async (req, res) => {
      try {
        const { meetingId } = req.query;
        if (!meetingId) {
          return res
            .status(400)
            .json({ success: false, message: "meetingId is required" });
        }
        const rows = await File.findAll({
          where: { meetingId, flag: "Y" },
          include: [{ model: User, as: "Uploader" }],
          order: [["created_at", "DESC"]],
        });
        return res.json({ success: true, data: rows.map(sanitize) });
      } catch (e) {
        return res
          .status(500)
          .json({ success: false, message: e.message || e });
      }
    },

    // POST /api/files  (form-data: meetingId, description?, file)
    create: async (req, res) => {
      try {
        if (!req.user)
          return res
            .status(401)
            .json({ success: false, message: "Unauthorized" });
        const { meetingId, description = null } = req.body || {};
        if (!meetingId)
          return res
            .status(400)
            .json({ success: false, message: "meetingId is required" });

        if (!req.file)
          return res
            .status(400)
            .json({ success: false, message: "file is required" });

        const originalName = req.file.originalname;
        const storedName = req.file.filename;
        const mimeType = req.file.mimetype;
        const size = req.file.size;
        const url = `${uploadBaseUrl}/${storedName}`;

        const row = await File.create({
          meetingId,
          uploaderId: req.user.id, // sesuaikan field PK user kamu
          originalName,
          storedName,
          mimeType,
          size,
          url,
          description,
          flag: "Y",
        });

        const created = await File.findByPk(row.fileId, {
          include: [{ model: User, as: "Uploader" }],
        });

        return res.status(201).json({ success: true, data: sanitize(created) });
      } catch (e) {
        return res
          .status(400)
          .json({ success: false, message: e.message || e });
      }
    },

    history: async (req, res) => {
      try {
        const limit = Math.min(Number(req.query.limit) || 20, 100);
        const excludeMeetingId = req.query.excludeMeetingId
          ? Number(req.query.excludeMeetingId)
          : null;
        const withFilesOnly = String(req.query.withFilesOnly || "1") === "1";
        const q = (req.query.q || "").trim();

        // ambil meetings aktif terbaru
        const whereMeeting = { flag: "Y" };
        if (excludeMeetingId)
          whereMeeting.meetingId = { [Op.ne]: excludeMeetingId };

        const meetings = await Meeting.findAll({
          where: whereMeeting,
          order: [["startTime", "DESC"]],
          limit,
          attributes: ["meetingId", "title", "startTime", "endTime", "status"],
        });

        if (meetings.length === 0) {
          return res.json({
            success: true,
            message: "Files history retrieved",
            data: [],
          });
        }

        const ids = meetings.map((m) => m.meetingId);

        const whereFiles = { meetingId: { [Op.in]: ids }, flag: "Y" };
        if (q) {
          whereFiles[Op.or] = [
            { originalName: { [Op.like]: `%${q}%` } },
            { description: { [Op.like]: `%${q}%` } },
          ];
        }

        const fileRows = await File.findAll({
          where: whereFiles,
          include: [{ model: User, as: "Uploader" }],
          order: [["created_at", "DESC"]],
        });

        // group by meetingId
        const grouped = new Map();
        for (const m of meetings) {
          grouped.set(m.meetingId, {
            meetingId: m.meetingId,
            title: m.title,
            startTime: m.startTime,
            endTime: m.endTime,
            status: m.status,
            files: [],
          });
        }
        for (const r of fileRows) {
          const g = grouped.get(r.meetingId);
          if (!g) continue;
          g.files.push(sanitize(r));
        }

        let data = Array.from(grouped.values());
        if (withFilesOnly)
          data = data.filter((g) => (g.files || []).length > 0);

        return res.json({
          success: true,
          message: "Files history retrieved",
          data,
        });
      } catch (e) {
        console.error("Files history error:", e);
        return res
          .status(500)
          .json({ success: false, message: e.message || e });
      }
    },

    // DELETE /api/files/:fileId (soft delete; optional: hapus file fisik)
    remove: async (req, res) => {
      try {
        if (!req.user)
          return res
            .status(401)
            .json({ success: false, message: "Unauthorized" });

        const { fileId } = req.params;
        const row = await File.findOne({ where: { fileId, flag: "Y" } });
        if (!row)
          return res
            .status(404)
            .json({ success: false, message: "File not found" });

        // rule: boleh hapus jika pemilik file atau admin/host
        const role = req.user?.UserRole?.nama;
        const isOwner = Number(row.uploaderId) === Number(req.user.id);
        const isMod = role === "admin" || role === "host";
        if (!isOwner && !isMod) {
          return res.status(403).json({ success: false, message: "Forbidden" });
        }

        // soft delete
        await row.update({ flag: "N" });

        // opsional: hapus fisik (jika mau betul2 remove fisik)
        // const fullpath = path.join(__dirname, "..", "uploads", "files", row.storedName);
        // fs.unlink(fullpath).catch(() => {});

        return res.json({ success: true, message: "File deleted" });
      } catch (e) {
        return res
          .status(500)
          .json({ success: false, message: e.message || e });
      }
    },

    markRead: async (req, res) => {
      try {
        const userId = req.user?.id;
        const { fileId } = req.params;
        if (!userId)
          return res
            .status(401)
            .json({ success: false, message: "Unauthorized" });

        const row = await File.findByPk(fileId);
        if (!row)
          return res
            .status(404)
            .json({ success: false, message: "File not found" });

        await FileRead.upsert({
          fileId: row.fileId,
          userId,
          readAt: new Date(),
        });
        return res.json({ success: true, message: "File marked as read" });
      } catch (e) {
        return res
          .status(500)
          .json({ success: false, message: e.message || e });
      }
    },

    // PATCH /api/files/:fileId/unread
    markUnread: async (req, res) => {
      try {
        const userId = req.user?.id;
        const { fileId } = req.params;
        if (!userId)
          return res
            .status(401)
            .json({ success: false, message: "Unauthorized" });

        await FileRead.destroy({ where: { fileId, userId } });
        return res.json({ success: true, message: "File marked as unread" });
      } catch (e) {
        return res
          .status(500)
          .json({ success: false, message: e.message || e });
      }
    },

    // POST /api/files/mark-all-read   (body: { meetingId? })
    markAllRead: async (req, res) => {
      try {
        const userId = req.user?.id;
        const { meetingId } = req.body || {};
        if (!userId)
          return res
            .status(401)
            .json({ success: false, message: "Unauthorized" });

        const where = { flag: "Y" };
        if (meetingId) where.meetingId = String(meetingId);

        const files = await File.findAll({ where, attributes: ["fileId"] });
        if (!files.length)
          return res.json({ success: true, message: "No files to mark" });

        const now = new Date();
        for (const f of files) {
          await FileRead.upsert({ fileId: f.fileId, userId, readAt: now });
        }
        return res.json({ success: true, message: "All files marked as read" });
      } catch (e) {
        return res
          .status(500)
          .json({ success: false, message: e.message || e });
      }
    },

    // GET /api/files/unread-count?meetingId=...
    unreadCount: async (req, res) => {
      try {
        const userId = req.user?.id;
        const { meetingId } = req.query;
        if (!userId)
          return res
            .status(401)
            .json({ success: false, message: "Unauthorized" });

        const where = { flag: "Y" };
        if (meetingId) where.meetingId = String(meetingId);

        const total = await File.count({ where });

        const q = `
          SELECT COUNT(*) AS cnt
          FROM m_files m
          JOIN m_file_reads r
            ON r.file_id = m.file_id
           AND r.user_id = :uid
          WHERE m.flag = 'Y' ${meetingId ? "AND m.meeting_id = :mid" : ""}
        `;
        const [[{ cnt }]] = await File.sequelize.query(q, {
          replacements: { uid: userId, mid: String(meetingId || "") },
        });

        const read = Number(cnt || 0);
        const unread = Math.max(0, total - read);
        return res.json({ success: true, data: { total, read, unread } });
      } catch (e) {
        return res
          .status(500)
          .json({ success: false, message: e.message || e });
      }
    },
  };
};
