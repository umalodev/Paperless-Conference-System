// controllers/filesController.js
const path = require("path");
const fs = require("fs/promises");

module.exports = (models, opts = {}) => {
  const { File, User } = models;
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
  };
};
