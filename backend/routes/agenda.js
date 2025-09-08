const express = require("express");
const router = express.Router();
const AgendaController = require("../controllers/agendaController");
const auth = require("../middleware/auth");

// GET all agendas (dengan filter/pagination opsional via query)
router.get("/", AgendaController.getAgendas);

// GET agendas by meeting
router.get("/meeting/:meetingId", AgendaController.getAgendasByMeeting);

// GET one
router.get("/:agendaId", AgendaController.getAgendaById);

// CREATE - Only hosts and admins can create agendas
router.post("/", auth.isAuthenticated, auth.isModerator, AgendaController.createAgenda);

// UPDATE - Only hosts and admins can update agendas
router.put("/:agendaId", auth.isAuthenticated, auth.isModerator, AgendaController.updateAgenda);

// SOFT DELETE - Only hosts and admins can delete agendas
router.delete("/:agendaId", auth.isAuthenticated, auth.isModerator, AgendaController.deleteAgenda);

// RESTORE - Only hosts and admins can restore agendas
router.post("/:agendaId/restore", auth.isAuthenticated, auth.isModerator, AgendaController.restoreAgenda);

// BULK REORDER - Only hosts and admins can reorder agendas
router.post("/reorder", auth.isAuthenticated, auth.isModerator, AgendaController.bulkReorder);

module.exports = router;
