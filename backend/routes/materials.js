const express = require("express");
const router = express.Router();
const MaterialsController = require("../controllers/materialsController");
const { authenticateToken } = require("../middleware/auth");
const auth = require("../middleware/auth");
const { upload } = require("../middleware/upload");

router.get(
  "/history",
  authenticateToken,
  MaterialsController.getMaterialsHistory
);

// Get materials by meeting ID
router.get(
  "/meeting/:meetingId",
  authenticateToken,
  MaterialsController.getMaterialsByMeeting
);

// Download material file - HARUS DI ATAS /:materialId
router.get(
  "/:materialId/download",
  authenticateToken,
  MaterialsController.downloadMaterial
);

// Get single material by ID
router.get(
  "/:materialId",
  authenticateToken,
  MaterialsController.getMaterialById
);

// Create new material (for file upload) - Only hosts and admins
router.post(
  "/",
  authenticateToken,
  auth.isModerator,
  MaterialsController.createMaterial
);

// Upload file for material - Only hosts and admins
router.post(
  "/upload/:meetingId",
  authenticateToken,
  auth.isModerator,
  upload.single("file"),
  MaterialsController.uploadFile
);

// Bulk create materials for a meeting - Only hosts and admins
router.post(
  "/bulk",
  authenticateToken,
  auth.isModerator,
  MaterialsController.bulkCreateMaterials
);

// Update material - Only hosts and admins
router.put(
  "/:materialId",
  authenticateToken,
  auth.isModerator,
  MaterialsController.updateMaterial
);

// Soft delete material - Only hosts and admins
router.delete(
  "/:materialId",
  authenticateToken,
  auth.isModerator,
  MaterialsController.deleteMaterial
);

// Restore soft-deleted material - Only hosts and admins
router.patch(
  "/:materialId/restore",
  authenticateToken,
  auth.isModerator,
  MaterialsController.restoreMaterial
);

// Clean up duplicate materials for a meeting - Only hosts and admins
router.post(
  "/cleanup/:meetingId",
  authenticateToken,
  auth.isModerator,
  MaterialsController.cleanupDuplicateMaterials
);

// Delete materials with "undefined" paths - Only hosts and admins
router.post(
  "/delete-undefined/:meetingId",
  authenticateToken,
  auth.isModerator,
  MaterialsController.deleteUndefinedMaterials
);

// Synchronize file paths for existing materials - Only hosts and admins
router.post(
  "/synchronize-paths/:meetingId",
  authenticateToken,
  auth.isModerator,
  MaterialsController.synchronizeFilePaths
);

module.exports = router;
