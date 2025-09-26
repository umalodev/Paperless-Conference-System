const express = require("express");
const router = express.Router();
const ServiceController = require("../controllers/serviceController");
const auth = require("../middleware/auth");

// helper guard: staff = admin/host/assist
const isStaff = (req, res, next) => {
  const role = String(req.user?.role || "").toLowerCase();
  if (["admin", "host", "assist"].includes(role)) return next();
  return res.status(403).json({ success: false, message: "Forbidden" });
};

// Public listing (opsional bisa tanpa auth)
router.get("/", ServiceController.list);
router.get("/meeting/:meetingId", ServiceController.listByMeeting);
router.get("/:id", ServiceController.getById);

// Create – perlu login (participant boleh)
router.post("/", auth.isAuthenticated, ServiceController.create);

// Update – staff only (ubah status/assign/flag)
router.put("/:id", auth.isAuthenticated, isStaff, ServiceController.update);

// Soft delete / restore – staff only
router.delete(
  "/:id",
  auth.isAuthenticated,
  isStaff,
  ServiceController.softDelete
);
router.post(
  "/:id/restore",
  auth.isAuthenticated,
  isStaff,
  ServiceController.restore
);

// Assign & Cancel
router.post(
  "/:id/assign",
  auth.isAuthenticated,
  isStaff,
  ServiceController.assign
);
router.post("/:id/cancel", auth.isAuthenticated, ServiceController.cancel);

module.exports = router;
