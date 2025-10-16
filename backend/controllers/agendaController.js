const { Op } = require("sequelize");
const { Agenda, Meeting, AgendaRead } = require("../models");

class AgendaController {
  /**
   * List agendas (aktif saja, bisa difilter)
   * Query: meetingId?, q?, from?, to?, page?, pageSize?, sortBy?, sortDir?, includeInactive?
   */
  static async getAgendas(req, res) {
    try {
      const {
        meetingId,
        q,
        from,
        to,
        page = 1,
        pageSize = 20,
        sortBy = "seq",
        sortDir = "ASC",
        includeInactive,
      } = req.query;

      const where = {};
      if (!includeInactive) where.flag = "Y";
      if (meetingId) where.meetingId = parseInt(meetingId, 10) || 0;

      if (q && String(q).trim()) {
        const kw = String(q).trim();
        where[Op.or] = [
          { judul: { [Op.like]: `%${kw}%` } },
          { deskripsi: { [Op.like]: `%${kw}%` } },
        ];
      }

      if (from || to) {
        where.startTime = {};
        if (from) where.startTime[Op.gte] = new Date(from);
        if (to) where.startTime[Op.lte] = new Date(to);
      }

      const pageN = Math.max(1, parseInt(page, 10) || 1);
      const sizeN = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20));
      const offset = (pageN - 1) * sizeN;

      const sortColMap = {
        seq: "seq",
        start_time: "start_time",
        created_at: "created_at",
        updated_at: "updated_at",
      };
      const orderCol = sortColMap[String(sortBy).toLowerCase()] || "seq";
      const orderDir =
        String(sortDir).toUpperCase() === "DESC" ? "DESC" : "ASC";

      const viewerId = req.user ? req.user.id : 0;

      const attributes = {};
      if (viewerId > 0) {
        // dapatkan nama tabel model ini untuk literal yang aman
        const t = Agenda.getTableName();
        const tableName = typeof t === "string" ? t : t.tableName;

        attributes.include = [
          [
            Agenda.sequelize.literal(`
              EXISTS(
                SELECT 1 FROM m_meeting_agenda_reads r
                WHERE r.agenda_id = ${tableName}.meeting_agenda_id
                  AND r.user_id = ${viewerId}
              )
            `),
            "isRead",
          ],
        ];
      }

      const { rows, count } = await Agenda.findAndCountAll({
        where,
        attributes,
        limit: sizeN,
        offset,
        order: [
          [orderCol, orderDir],
          ["start_time", "ASC"],
          ["meeting_agenda_id", "ASC"],
        ],
      });

      res.json({
        success: true,
        message: "Agendas fetched successfully",
        data: rows,
        pagination: {
          page: pageN,
          pageSize: sizeN,
          total: count,
          totalPages: Math.ceil(count / sizeN),
        },
      });
    } catch (error) {
      console.error("Get agendas error:", error);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }

  static async getAgendaHistory(req, res) {
    try {
      const limit = Math.min(Number(req.query.limit) || 20, 100);
      const excludeMeetingId = req.query.excludeMeetingId
        ? Number(req.query.excludeMeetingId)
        : null;
      const withAgendasOnly = String(req.query.withAgendasOnly || "1") === "1";

      // ambil meeting aktif terbaru
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
          message: "Agenda history retrieved",
          data: [],
        });
      }

      const ids = meetings.map((m) => m.meetingId);
      const agendaRows = await Agenda.findAll({
        where: { meetingId: { [Op.in]: ids }, flag: "Y" },
        order: [
          ["seq", "ASC"],
          ["start_time", "ASC"],
          ["meeting_agenda_id", "ASC"],
        ],
        attributes: [
          "meetingAgendaId",
          "meetingId",
          "judul",
          "deskripsi",
          "startTime",
          "endTime",
          "seq",
        ],
      });

      // group agenda by meetingId
      const grouped = new Map();
      for (const m of meetings) {
        grouped.set(m.meetingId, {
          meetingId: m.meetingId,
          title: m.title,
          startTime: m.startTime,
          endTime: m.endTime,
          status: m.status,
          agendas: [],
        });
      }
      for (const a of agendaRows) {
        const g = grouped.get(a.meetingId);
        if (!g) continue;
        g.agendas.push({
          id: a.meetingAgendaId,
          judul: a.judul,
          deskripsi: a.deskripsi,
          startTime: a.startTime,
          endTime: a.endTime,
          seq: a.seq,
        });
      }

      let data = Array.from(grouped.values());
      if (withAgendasOnly) data = data.filter((g) => g.agendas.length > 0);

      return res.json({
        success: true,
        message: "Agenda history retrieved",
        data,
      });
    } catch (error) {
      console.error("Get agenda history error:", error);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }

  /**
   * List agendas by meeting (ringkas; default hanya aktif)
   */
  static async getAgendasByMeeting(req, res) {
    try {
      const { meetingId } = req.params;
      const includeInactive = req.query.includeInactive === "1";
      const viewerId = req.user?.id || 0;
      const rows = await Agenda.findAll({
        where: {
          meetingId: parseInt(meetingId, 10) || 0,
          ...(includeInactive ? {} : { flag: "Y" }),
        },
        attributes: {
          include: [
            [
              Agenda.sequelize.literal(`
          EXISTS(
            SELECT 1 FROM m_meeting_agenda_reads r
            WHERE r.agenda_id = m_meeting_agenda.meeting_agenda_id
              AND r.user_id = ${viewerId}
          )
        `),
              "isRead",
            ],
          ],
        },
        order: [
          ["seq", "ASC"],
          ["start_time", "ASC"],
          ["meeting_agenda_id", "ASC"],
        ],
      });
      res.json({
        success: true,
        message: "Agendas by meeting fetched successfully",
        data: rows,
      });
    } catch (error) {
      console.error("Get agendas by meeting error:", error);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }

  /**
   * Get single agenda
   */
  static async getAgendaById(req, res) {
    try {
      const { agendaId } = req.params;
      const agenda = await Agenda.findByPk(agendaId);
      if (!agenda) {
        return res
          .status(404)
          .json({ success: false, message: "Agenda not found" });
      }
      res.json({ success: true, message: "Agenda fetched", data: agenda });
    } catch (error) {
      console.error("Get agenda error:", error);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }

  /**
   * Create agenda
   * Body: { meetingId, judul, deskripsi?, start_time, end_time, seq? }
   */
  static async createAgenda(req, res) {
    try {
      const { meetingId, judul, deskripsi, start_time, end_time, seq } =
        req.body;

      if (!meetingId)
        return res
          .status(400)
          .json({ success: false, message: "meetingId is required" });
      if (!judul)
        return res
          .status(400)
          .json({ success: false, message: "judul is required" });
      if (!start_time || !end_time) {
        return res.status(400).json({
          success: false,
          message: "start_time and end_time are required",
        });
      }
      const start = new Date(start_time);
      const end = new Date(end_time);
      if (!(start < end)) {
        return res.status(400).json({
          success: false,
          message: "end_time must be greater than start_time",
        });
      }

      const agenda = await Agenda.create({
        meetingId: parseInt(meetingId, 10) || 0,
        judul,
        deskripsi: deskripsi ?? null,
        startTime: start,
        endTime: end,
        seq: seq ? parseInt(seq, 10) || 1 : 1,
        flag: "Y",
      });

      res.status(201).json({
        success: true,
        message: "Agenda created successfully",
        data: agenda,
      });
    } catch (error) {
      console.error("Create agenda error:", error);
      res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * Update agenda
   * Body (subset): { judul?, deskripsi?, start_time?, end_time?, seq?, flag? }
   */
  static async updateAgenda(req, res) {
    try {
      const { agendaId } = req.params;
      const agenda = await Agenda.findByPk(agendaId);
      if (!agenda) {
        return res
          .status(404)
          .json({ success: false, message: "Agenda not found" });
      }

      const { judul, deskripsi, start_time, end_time, seq, flag } = req.body;

      if (judul !== undefined) agenda.judul = judul;
      if (deskripsi !== undefined) agenda.deskripsi = deskripsi;
      if (seq !== undefined) agenda.seq = parseInt(seq, 10) || agenda.seq;

      if (start_time !== undefined) agenda.startTime = new Date(start_time);
      if (end_time !== undefined) agenda.endTime = new Date(end_time);
      if (
        agenda.startTime &&
        agenda.endTime &&
        !(agenda.startTime < agenda.endTime)
      ) {
        return res.status(400).json({
          success: false,
          message: "end_time must be greater than start_time",
        });
      }

      if (flag !== undefined) {
        const v = String(flag).toUpperCase();
        if (!["Y", "N"].includes(v)) {
          return res
            .status(400)
            .json({ success: false, message: "flag must be Y or N" });
        }
        agenda.flag = v;
      }

      await agenda.save();
      res.json({
        success: true,
        message: "Agenda updated successfully",
        data: agenda,
      });
    } catch (error) {
      console.error("Update agenda error:", error);
      res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * Soft delete agenda (flag = 'N')
   */
  static async deleteAgenda(req, res) {
    try {
      const { agendaId } = req.params;
      const agenda = await Agenda.findByPk(agendaId);
      if (!agenda) {
        return res
          .status(404)
          .json({ success: false, message: "Agenda not found" });
      }
      agenda.flag = "N";
      await agenda.save();
      res.json({ success: true, message: "Agenda deleted (soft)" });
    } catch (error) {
      console.error("Delete agenda error:", error);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }

  /**
   * Restore soft-deleted agenda (flag = 'Y')
   */
  static async restoreAgenda(req, res) {
    try {
      const { agendaId } = req.params;
      const agenda = await Agenda.findByPk(agendaId);
      if (!agenda) {
        return res
          .status(404)
          .json({ success: false, message: "Agenda not found" });
      }
      agenda.flag = "Y";
      await agenda.save();
      res.json({ success: true, message: "Agenda restored", data: agenda });
    } catch (error) {
      console.error("Restore agenda error:", error);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }

  /**
   * Bulk reorder seq untuk 1 meeting
   * Body: { meetingId, orders: [{agendaId, seq}, ...] }
   */
  static async bulkReorder(req, res) {
    const t = await Agenda.sequelize.transaction();
    try {
      const { meetingId, orders } = req.body;
      if (!meetingId || !Array.isArray(orders) || orders.length === 0) {
        return res.status(400).json({
          success: false,
          message: "meetingId dan orders[] dibutuhkan",
        });
      }

      for (const item of orders) {
        const { agendaId, seq } = item || {};
        if (!agendaId || !seq) continue;
        await Agenda.update(
          { seq: parseInt(seq, 10) || 1 },
          {
            where: {
              meetingId: parseInt(meetingId, 10) || 0,
              meetingAgendaId: agendaId,
            },
            transaction: t,
          }
        );
      }

      await t.commit();
      res.json({ success: true, message: "Reorder selesai" });
    } catch (error) {
      await t.rollback();
      console.error("Bulk reorder error:", error);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }

  static async markRead(req, res) {
    try {
      const userId = req.user?.id;
      const { agendaId } = req.params;
      if (!userId)
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });

      const agenda = await Agenda.findByPk(agendaId);
      if (!agenda)
        return res
          .status(404)
          .json({ success: false, message: "Agenda not found" });

      await AgendaRead.upsert({
        agendaId: agenda.meetingAgendaId,
        userId,
        readAt: new Date(),
      });

      res.json({ success: true, message: "Agenda marked as read" });
    } catch (err) {
      console.error("markRead error:", err);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }

  static async markUnread(req, res) {
    try {
      const userId = req.user?.id;
      const { agendaId } = req.params;
      if (!userId)
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });

      await AgendaRead.destroy({ where: { agendaId, userId } });
      res.json({ success: true, message: "Agenda marked as unread" });
    } catch (err) {
      console.error("markUnread error:", err);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }

  static async markAllRead(req, res) {
    try {
      const userId = req.user?.id;
      const { meetingId } = req.body; // opsional: tandai semua pada 1 meeting
      if (!userId)
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });

      const whereAg = { flag: "Y" };
      if (meetingId) whereAg.meetingId = Number(meetingId) || 0;

      const agendas = await Agenda.findAll({
        where: whereAg,
        attributes: ["meetingAgendaId"],
      });
      if (!agendas.length)
        return res.json({ success: true, message: "No agendas to mark" });

      const now = new Date();
      const payload = agendas.map((a) => ({
        agendaId: a.meetingAgendaId,
        userId,
        readAt: now,
      }));

      // Upsert massal: sederhana via loop (aman, jelas)
      for (const p of payload) {
        await AgendaRead.upsert(p);
      }

      res.json({ success: true, message: "All agendas marked as read" });
    } catch (err) {
      console.error("markAllRead error:", err);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }

  static async unreadCount(req, res) {
    try {
      const userId = req.user?.id;
      const { meetingId } = req.query;
      if (!userId)
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });

      const whereAg = { flag: "Y" };
      if (meetingId) whereAg.meetingId = Number(meetingId) || 0;

      // hitung total agenda aktif
      const total = await Agenda.count({ where: whereAg });

      // hitung yang sudah read oleh user
      const q = `
        SELECT COUNT(*) AS cnt
        FROM m_meeting_agenda a
        JOIN m_meeting_agenda_reads r ON r.agenda_id = a.meeting_agenda_id AND r.user_id = :uid
        WHERE a.flag = 'Y' ${meetingId ? "AND a.meeting_id = :mid" : ""}
      `;
      const [[{ cnt: readCount }]] = await Agenda.sequelize.query(q, {
        replacements: { uid: userId, mid: Number(meetingId) || 0 },
      });

      const unread = Math.max(0, total - Number(readCount || 0));
      res.json({
        success: true,
        data: { total, read: Number(readCount || 0), unread },
      });
    } catch (err) {
      console.error("unreadCount error:", err);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }
}

module.exports = AgendaController;
