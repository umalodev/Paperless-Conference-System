const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");

// inject models & sequelize (sesuaikan cara kamu export di app)
const db = require("../models"); // pastikan index.js export { sequelize, ...models }
const surveyControllerFactory = require("../controllers/surveyController");
const controller = surveyControllerFactory(db, db.sequelize);

// types (kamus)
router.get("/types", auth.isAuthenticated, controller.listTypes);

// list berdasarkan meeting
router.get(
  "/meeting/:meetingId",
  auth.isAuthenticated,
  controller.getByMeeting
);

// detail
router.get("/:surveyId", auth.isAuthenticated, controller.getById);

// create & update & delete
router.post("/", auth.isAuthenticated, controller.create);
router.put("/:surveyId", auth.isAuthenticated, controller.update);
router.delete("/:surveyId", auth.isAuthenticated, controller.remove);

// question CRUD
router.post(
  "/:surveyId/questions",
  auth.isAuthenticated,
  controller.addQuestion
);
router.put(
  "/:surveyId/questions/:questionId",
  auth.isAuthenticated,
  controller.updateQuestion
);
router.delete(
  "/:surveyId/questions/:questionId",
  auth.isAuthenticated,
  controller.deleteQuestion
);

router.post(
  "/:surveyId/responses",
  auth.isAuthenticated,
  controller.submitResponses
);
router.get(
  "/:surveyId/responses/me",
  auth.isAuthenticated,
  controller.getMyResponse
);

// toggle tampil
router.patch(
  "/:surveyId/visibility",
  auth.isAuthenticated,
  controller.toggleVisibility
);

router.get(
  "/:surveyId/responses",
  auth.isAuthenticated,
  controller.listResponses
);
router.get(
  "/:surveyId/responses.csv",
  auth.isAuthenticated,
  controller.exportResponsesCSV
);

module.exports = router;
