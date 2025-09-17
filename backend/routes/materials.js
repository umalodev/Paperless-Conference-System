const express = require("express");
const router = express.Router();
const MaterialsController = require("../controllers/materialsController");
const auth = require("../middleware/auth");

const { upload } = require("../middleware/upload");

router.get(
  "/history",
  auth.isAuthenticated,
  MaterialsController.getMaterialsHistory
);

// Get materials by meeting ID
router.get(
  "/meeting/:meetingId",
  auth.isAuthenticated,
  MaterialsController.getMaterialsByMeeting
);

// Download material file - HARUS DI ATAS /:materialId
router.get(
  "/:materialId/download",
  auth.isAuthenticated,
  MaterialsController.downloadMaterial
);

// Get single material by ID
router.get(
  "/:materialId",
  auth.isAuthenticated,
  MaterialsController.getMaterialById
);

// Create new material (for file upload) - Only hosts and admins
router.post(
  "/",
  auth.isAuthenticated,
  auth.isModerator,
  MaterialsController.createMaterial
);

// Upload file for material - Only hosts and admins
router.post(
  "/upload/:meetingId",
  auth.isAuthenticated,
  auth.isModerator,
  upload.single("file"),
  MaterialsController.uploadFile
);

// Bulk create materials for a meeting - Only hosts and admins
router.post(
  "/bulk",
  auth.isAuthenticated,
  auth.isModerator,
  MaterialsController.bulkCreateMaterials
);

// Update material - Only hosts and admins
router.put(
  "/:materialId",
  auth.isAuthenticated,
  auth.isModerator,
  MaterialsController.updateMaterial
);

// Soft delete material - Only hosts and admins
router.delete(
  "/:materialId",
  auth.isAuthenticated,
  auth.isModerator,
  MaterialsController.deleteMaterial
);

// Restore soft-deleted material - Only hosts and admins
router.patch(
  "/:materialId/restore",
  auth.isAuthenticated,
  auth.isModerator,
  MaterialsController.restoreMaterial
);

// Clean up duplicate materials for a meeting - Only hosts and admins
router.post(
  "/cleanup/:meetingId",
  auth.isAuthenticated,
  auth.isModerator,
  MaterialsController.cleanupDuplicateMaterials
);

// Delete materials with "undefined" paths - Only hosts and admins
router.post(
  "/delete-undefined/:meetingId",
  auth.isAuthenticated,
  auth.isModerator,
  MaterialsController.deleteUndefinedMaterials
);

// Synchronize file paths for existing materials - Only hosts and admins
router.post(
  "/synchronize-paths/:meetingId",
  auth.isAuthenticated,
  auth.isModerator,
  MaterialsController.synchronizeFilePaths
);

module.exports = router;
