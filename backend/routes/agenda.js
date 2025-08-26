const express = require("express");
const router = express.Router();
const AgendaController = require("../controllers/agendaController");

// GET all agendas (dengan filter/pagination opsional via query)
router.get("/", AgendaController.getAgendas);

// GET agendas by meeting
router.get("/meeting/:meetingId", AgendaController.getAgendasByMeeting);

// GET one
router.get("/:agendaId", AgendaController.getAgendaById);

// CREATE
router.post("/", AgendaController.createAgenda);

// UPDATE
router.put("/:agendaId", AgendaController.updateAgenda);

// SOFT DELETE
router.delete("/:agendaId", AgendaController.deleteAgenda);

// RESTORE
router.post("/:agendaId/restore", AgendaController.restoreAgenda);

// BULK REORDER
router.post("/reorder", AgendaController.bulkReorder);

module.exports = router;
