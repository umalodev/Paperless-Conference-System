const express = require("express");
const router = express.Router();

const { authenticateToken } = require("../middleware/auth");

// inject models & sequelize (sesuaikan cara kamu export di app)
const db = require("../models"); // pastikan index.js export { sequelize, ...models }
const surveyControllerFactory = require("../controllers/surveyController");
const controller = surveyControllerFactory(db, db.sequelize);

// types (kamus)
router.get("/types", authenticateToken, controller.listTypes);

// list berdasarkan meeting
router.get("/meeting/:meetingId", authenticateToken, controller.getByMeeting);

// detail
router.get("/:surveyId", authenticateToken, controller.getById);

// create & update & delete
router.post("/", authenticateToken, controller.create);
router.put("/:surveyId", authenticateToken, controller.update);
router.delete("/:surveyId", authenticateToken, controller.remove);

// question CRUD
router.post("/:surveyId/questions", authenticateToken, controller.addQuestion);
router.put(
  "/:surveyId/questions/:questionId",
  authenticateToken,
  controller.updateQuestion
);
router.delete(
  "/:surveyId/questions/:questionId",
  authenticateToken,
  controller.deleteQuestion
);

router.post(
  "/:surveyId/responses",
  authenticateToken,
  controller.submitResponses
);
router.get(
  "/:surveyId/responses/me",
  authenticateToken,
  controller.getMyResponse
);

// toggle tampil
router.patch(
  "/:surveyId/visibility",
  authenticateToken,
  controller.toggleVisibility
);

module.exports = router;
