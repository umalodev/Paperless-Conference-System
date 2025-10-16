const { Op } = require("sequelize");
const { ServiceRequest, ServiceInboxSeen } = require("../models");
const toInt = (v, d = 0) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : d;
};

class ServiceController {
  static async list(req, res) {
    try {
      const {
        meetingId,
        requesterUserId,
        status,
        priority,
        q,
        from,
        to,
        page = 1,
        pageSize = 20,
        includeInactive,
        sortBy = "created_at",
        sortDir = "DESC",
      } = req.query;

      const where = {};
      if (!includeInactive) where.flag = "Y";
      if (meetingId) where.meetingId = toInt(meetingId);
      if (requesterUserId) where.requesterUserId = toInt(requesterUserId);

      if (status) {
        const s = String(status).toLowerCase();
        if (["pending", "accepted", "done", "cancelled"].includes(s))
          where.status = s;
      }
      if (priority) {
        const p = String(priority);
        if (["Low", "Normal", "High"].includes(p)) where.priority = p;
      }
      if (q && String(q).trim()) {
        const kw = String(q).trim();
        where[Op.or] = [
          { serviceLabel: { [Op.like]: `%${kw}%` } },
          { serviceKey: { [Op.like]: `%${kw}%` } },
          { name: { [Op.like]: `%${kw}%` } }, // CHANGED
          { note: { [Op.like]: `%${kw}%` } },
        ];
      }
      if (from || to) {
        where.created_at = {};
        if (from) where.created_at[Op.gte] = new Date(from);
        if (to) where.created_at[Op.lte] = new Date(to);
      }

      const pageN = Math.max(1, toInt(page, 1));
      const sizeN = Math.min(100, Math.max(1, toInt(pageSize, 20)));
      const offset = (pageN - 1) * sizeN;

      const sortColMap = {
        created_at: "created_at",
        updated_at: "updated_at",
        priority: "priority",
        status: "status",
        handled_at: "handled_at",
        name: "name", // CHANGED: allow sort by name
      };
      const orderCol = sortColMap[String(sortBy).toLowerCase()] || "created_at";
      const orderDir = String(sortDir).toUpperCase() === "ASC" ? "ASC" : "DESC";

      const { rows, count } = await ServiceRequest.findAndCountAll({
        where,
        limit: sizeN,
        offset,
        order: [
          [orderCol, orderDir],
          ["service_request_id", "DESC"],
        ],
      });

      return res.json({
        success: true,
        message: "Service requests fetched",
        data: rows,
        pagination: {
          page: pageN,
          pageSize: sizeN,
          total: count,
          totalPages: Math.ceil(count / sizeN),
        },
      });
    } catch (error) {
      console.error("Service list error:", error);
      return res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }

  static async unreadCount(req, res) {
    try {
      const role = String(req.user?.role || "").toLowerCase();
      const userId = req.user?.id || req.user?.userId;
      const meetingId = Number(req.query.meetingId || 0);

      if (role !== "assist" || !meetingId || !userId) {
        return res.json({ success: true, data: { total: 0, unread: 0 } });
      }

      // total pending yg BUKAN dibuat oleh assist yg sedang login
      const total = await ServiceRequest.count({
        where: {
          flag: "Y",
          meetingId,
          status: "pending",
          requesterUserId: { [Op.ne]: userId },
        },
      });

      // ambil lastSeen si assist utk meeting tsb
      const seen = await ServiceInboxSeen.findOne({
        where: { userId, meetingId, flag: "Y" },
        attributes: ["lastSeen"],
      });
      const since = seen?.lastSeen ?? new Date(0);

      // unread = pending yg dibuat SETELAH lastSeen
      const unread = await ServiceRequest.count({
        where: {
          flag: "Y",
          meetingId,
          status: "pending",
          requesterUserId: { [Op.ne]: userId },
          created_at: { [Op.gt]: since }, // kolom fisik oke krn model pakai createdAt:"created_at"
        },
      });

      return res.json({ success: true, data: { total, unread } });
    } catch (e) {
      console.error("services unreadCount error:", e);
      return res.status(500).json({
        success: false,
        message: e.message || "Internal server error",
      });
    }
  }

  static async markSeen(req, res) {
    try {
      const role = String(req.user?.role || "").toLowerCase();
      const userId = req.user?.id || req.user?.userId;
      const meetingId = Number(req.body?.meetingId || 0);
      if (!userId)
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });
      if (!meetingId)
        return res.json({ success: true, message: "No meetingId" });

      // hanya assist yang kita tracking
      if (role !== "assist") {
        return res.json({ success: true, message: "Ignored (not assist)" });
      }

      await ServiceInboxSeen.upsert({
        userId,
        meetingId,
        lastSeen: new Date(),
        flag: "Y",
      });

      return res.json({ success: true, message: "Seen updated" });
    } catch (e) {
      console.error("services markSeen error:", e);
      return res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }

  static async listByMeeting(req, res) {
    try {
      const { meetingId } = req.params;
      const includeInactive = req.query.includeInactive === "1";
      const rows = await ServiceRequest.findAll({
        where: {
          meetingId: toInt(meetingId),
          ...(includeInactive ? {} : { flag: "Y" }),
        },
        order: [
          ["created_at", "DESC"],
          ["service_request_id", "DESC"],
        ],
      });
      return res.json({
        success: true,
        message: "Service requests by meeting fetched",
        data: rows,
      });
    } catch (error) {
      console.error("Service listByMeeting error:", error);
      return res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }

  static async getById(req, res) {
    try {
      const { id } = req.params;
      const row = await ServiceRequest.findByPk(id);
      if (!row)
        return res
          .status(404)
          .json({ success: false, message: "Service request not found" });
      return res.json({
        success: true,
        message: "Service request fetched",
        data: row,
      });
    } catch (error) {
      console.error("Service getById error:", error);
      return res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }

  // CREATE: now expects name; still accepts seat for backward compatibility
  static async create(req, res) {
    try {
      const {
        meetingId,
        serviceKey,
        serviceLabel,
        name, // CHANGED
        seat, // backward compat
        priority = "Normal",
        note,
        requesterUserId,
      } = req.body;

      if (!meetingId)
        return res
          .status(400)
          .json({ success: false, message: "meetingId is required" });
      if (!serviceKey)
        return res
          .status(400)
          .json({ success: false, message: "serviceKey is required" });
      if (!serviceLabel)
        return res
          .status(400)
          .json({ success: false, message: "serviceLabel is required" });

      const effectiveName = (name ?? seat ?? "").trim(); // CHANGED
      if (!effectiveName)
        return res
          .status(400)
          .json({ success: false, message: "name is required" });

      const requesterId =
        req.user?.id || req.user?.userId || toInt(requesterUserId);
      if (!requesterId)
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized requester" });

      const row = await ServiceRequest.create({
        meetingId: toInt(meetingId),
        requesterUserId: requesterId,
        serviceKey,
        serviceLabel,
        name: effectiveName, // CHANGED
        priority: ["Low", "Normal", "High"].includes(priority)
          ? priority
          : "Normal",
        note: note ?? null,
        status: "pending",
        flag: "Y",
      });

      return res
        .status(201)
        .json({ success: true, message: "Service request created", data: row });
    } catch (error) {
      console.error("Service create error:", error);
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  static async update(req, res) {
    try {
      const { id } = req.params;
      const row = await ServiceRequest.findByPk(id);
      if (!row)
        return res
          .status(404)
          .json({ success: false, message: "Service request not found" });

      const isStaff = ["admin", "host", "assist"].includes(
        String(req.user?.role || "").toLowerCase()
      );
      const isOwner =
        (req.user?.id || req.user?.userId) === row.requesterUserId;

      const {
        name, // CHANGED
        seat, // backward compat
        priority,
        note,
        status,
        handledByUserId,
        handledAt,
        flag,
      } = req.body;

      // Owner can edit while pending
      if (isOwner && row.status === "pending") {
        const effectiveName = name ?? seat; // CHANGED
        if (effectiveName !== undefined) row.name = String(effectiveName);
        if (note !== undefined) row.note = note;
        if (priority !== undefined) {
          if (!["Low", "Normal", "High"].includes(priority)) {
            return res
              .status(400)
              .json({ success: false, message: "Invalid priority" });
          }
          row.priority = priority;
        }
      }

      // Staff can update status/handler/flag
      if (isStaff) {
        if (status !== undefined) {
          const s = String(status).toLowerCase();
          if (!["pending", "accepted", "done", "cancelled"].includes(s)) {
            return res
              .status(400)
              .json({ success: false, message: "Invalid status" });
          }
          row.status = s;
          if (["accepted", "done", "cancelled"].includes(s) && !handledAt)
            row.handledAt = new Date();
        }
        if (handledByUserId !== undefined)
          row.handledByUserId = toInt(handledByUserId) || null;
        if (handledAt !== undefined)
          row.handledAt = handledAt ? new Date(handledAt) : null;
        if (flag !== undefined) {
          const v = String(flag).toUpperCase();
          if (!["Y", "N"].includes(v))
            return res
              .status(400)
              .json({ success: false, message: "flag must be Y or N" });
          row.flag = v;
        }
      }

      await row.save();
      return res.json({
        success: true,
        message: "Service request updated",
        data: row,
      });
    } catch (error) {
      console.error("Service update error:", error);
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  static async softDelete(req, res) {
    try {
      const { id } = req.params;
      const row = await ServiceRequest.findByPk(id);
      if (!row)
        return res
          .status(404)
          .json({ success: false, message: "Service request not found" });
      row.flag = "N";
      await row.save();
      return res.json({
        success: true,
        message: "Service request deleted (soft)",
      });
    } catch (error) {
      console.error("Service softDelete error:", error);
      return res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }

  static async restore(req, res) {
    try {
      const { id } = req.params;
      const row = await ServiceRequest.findByPk(id);
      if (!row)
        return res
          .status(404)
          .json({ success: false, message: "Service request not found" });
      row.flag = "Y";
      await row.save();
      return res.json({
        success: true,
        message: "Service request restored",
        data: row,
      });
    } catch (error) {
      console.error("Service restore error:", error);
      return res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }

  static async assign(req, res) {
    try {
      const { id } = req.params;
      const row = await ServiceRequest.findByPk(id);
      if (!row)
        return res
          .status(404)
          .json({ success: false, message: "Service request not found" });

      const handlerId =
        toInt(req.body?.handledByUserId) || req.user?.id || req.user?.userId;
      if (!handlerId)
        return res
          .status(400)
          .json({ success: false, message: "handledByUserId is required" });

      row.handledByUserId = handlerId;
      if (row.status === "pending") row.status = "accepted";
      row.handledAt = new Date();
      await row.save();

      return res.json({
        success: true,
        message: "Service request assigned",
        data: row,
      });
    } catch (error) {
      console.error("Service assign error:", error);
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  static async cancel(req, res) {
    try {
      const { id } = req.params;
      const row = await ServiceRequest.findByPk(id);
      if (!row)
        return res
          .status(404)
          .json({ success: false, message: "Service request not found" });

      const isStaff = ["admin", "host", "assist"].includes(
        String(req.user?.role || "").toLowerCase()
      );
      const isOwner =
        (req.user?.id || req.user?.userId) === row.requesterUserId;

      if (!isStaff && !(isOwner && row.status === "pending")) {
        return res.status(403).json({
          success: false,
          message: "Not allowed to cancel this request",
        });
      }

      row.status = "cancelled";
      row.handledAt = new Date();
      await row.save();

      return res.json({
        success: true,
        message: "Service request cancelled",
        data: row,
      });
    } catch (error) {
      console.error("Service cancel error:", error);
      return res.status(400).json({ success: false, message: error.message });
    }
  }
}

module.exports = ServiceController;
