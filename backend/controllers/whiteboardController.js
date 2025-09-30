// controllers/whiteboardController.js
module.exports = (models) => {
  const { Whiteboard } = models;

  const safeParse = (s) => {
    try {
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  };

  const sanitize = (row) => ({
    whiteboardId: row.whiteboardId,
    meetingId: row.meetingId,
    userId: row.userId,
    title: row.title || null,
    data: safeParse(row.dataJson) || { strokes: [] },
    createdAt: row.created_at || row.createdAt,
    updatedAt: row.updated_at || row.updatedAt,
  });

  return {
    // GET /api/whiteboard?meetingId=...
    // Ambil whiteboard milik user saat ini (privat)
    getMine: async (req, res) => {
      try {
        if (!req.user)
          return res
            .status(401)
            .json({ success: false, message: "Unauthorized" });

        const meetingId = Number(req.query.meetingId);
        if (!meetingId)
          return res
            .status(400)
            .json({ success: false, message: "meetingId is required" });

        const row = await Whiteboard.findOne({
          where: { meetingId, userId: req.user.id, flag: "Y" },
        });

        return res.json({ success: true, data: row ? sanitize(row) : null });
      } catch (e) {
        return res
          .status(500)
          .json({ success: false, message: e.message || e });
      }
    },

    // POST /api/whiteboard
    // Upsert whiteboard milik user
    upsertMine: async (req, res) => {
      try {
        if (!req.user)
          return res
            .status(401)
            .json({ success: false, message: "Unauthorized" });

        const meetingId = Number(req.body?.meetingId);
        if (!meetingId)
          return res
            .status(400)
            .json({ success: false, message: "meetingId is required" });

        const title =
          (typeof req.body?.title === "string" && req.body.title.trim()) ||
          null;
        const data = req.body?.data || null; // object (strokes)
        const dataJson = data ? JSON.stringify(data) : null;

        let row = await Whiteboard.findOne({
          where: { meetingId, userId: req.user.id, flag: "Y" },
        });

        if (!row) {
          row = await Whiteboard.create({
            meetingId,
            userId: req.user.id,
            title,
            dataJson,
            flag: "Y",
          });
        } else {
          await row.update({
            title: title ?? row.title,
            dataJson: dataJson ?? row.dataJson,
          });
        }

        return res.json({ success: true, data: sanitize(row) });
      } catch (e) {
        return res
          .status(500)
          .json({ success: false, message: e.message || e });
      }
    },

    // PATCH /api/whiteboard/:id
    updateById: async (req, res) => {
      try {
        if (!req.user)
          return res
            .status(401)
            .json({ success: false, message: "Unauthorized" });

        const id = Number(req.params.id);
        const row = await Whiteboard.findOne({
          where: { whiteboardId: id, flag: "Y" },
        });
        if (!row)
          return res.status(404).json({ success: false, message: "Not found" });

        if (Number(row.userId) !== Number(req.user.id))
          return res.status(403).json({ success: false, message: "Forbidden" });

        const patch = {};
        if ("title" in req.body) {
          patch.title =
            (typeof req.body.title === "string" && req.body.title.trim()) ||
            null;
        }
        if ("data" in req.body) {
          patch.dataJson = req.body.data ? JSON.stringify(req.body.data) : null;
        }

        await row.update(patch);
        return res.json({ success: true, data: sanitize(row) });
      } catch (e) {
        return res
          .status(500)
          .json({ success: false, message: e.message || e });
      }
    },

    // POST /api/whiteboard/clear  (body: {meetingId})
    clearMine: async (req, res) => {
      try {
        if (!req.user)
          return res
            .status(401)
            .json({ success: false, message: "Unauthorized" });

        const meetingId = Number(req.body?.meetingId);
        if (!meetingId)
          return res
            .status(400)
            .json({ success: false, message: "meetingId is required" });

        const row = await Whiteboard.findOne({
          where: { meetingId, userId: req.user.id, flag: "Y" },
        });
        if (!row)
          return res.json({
            success: true,
            data: {
              whiteboardId: null,
              meetingId,
              userId: req.user.id,
              data: { strokes: [] },
            },
          });

        await row.update({ dataJson: JSON.stringify({ strokes: [] }) });
        return res.json({ success: true, data: sanitize(row) });
      } catch (e) {
        return res
          .status(500)
          .json({ success: false, message: e.message || e });
      }
    },

    // DELETE /api/whiteboard/:id (soft delete)
    remove: async (req, res) => {
      try {
        if (!req.user)
          return res
            .status(401)
            .json({ success: false, message: "Unauthorized" });

        const id = Number(req.params.id);
        const row = await Whiteboard.findOne({
          where: { whiteboardId: id, flag: "Y" },
        });
        if (!row)
          return res.status(404).json({ success: false, message: "Not found" });

        const role = (
          req.user.role ||
          req.user?.UserRole?.nama ||
          ""
        ).toLowerCase();
        const isOwner = Number(row.userId) === Number(req.user.id);
        const isMod = ["admin", "host"].includes(role);
        if (!isOwner && !isMod)
          return res.status(403).json({ success: false, message: "Forbidden" });

        await row.update({ flag: "N" });
        return res.json({ success: true, message: "Whiteboard deleted" });
      } catch (e) {
        return res
          .status(500)
          .json({ success: false, message: e.message || e });
      }
    },
  };
};
