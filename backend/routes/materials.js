const express = require("express");
const router = express.Router();
const MaterialsController = require("../controllers/materialsController");
const auth = require("../middleware/auth");
const { upload } = require("../middleware/upload");

function handleUpload(req, res, next) {
  upload.single("file")(req, res, (err) => {
    if (err) {
      // Mapping error agar user-friendly
      // pastikan di fileFilter kamu set err.code = "UNSUPPORTED_FILE_TYPE" (lihat catatan di bawah)
      if (err.code === "UNSUPPORTED_FILE_TYPE") {
        return res
          .status(415)
          .json({ success: false, message: "Format file tidak didukung" });
      }
      if (err.code === "LIMIT_FILE_SIZE") {
        return res
          .status(413)
          .json({ success: false, message: "Ukuran file terlalu besar" });
      }
      if (err.name === "MulterError") {
        return res
          .status(400)
          .json({ success: false, message: `Gagal upload: ${err.code}` });
      }
      // fallback
      return res.status(400).json({
        success: false,
        message: err.message || "Format file tidak didukung",
      });
    }
    // tidak ada error -> lanjut ke controller
    next();
  });
}

router.get(
  "/unread-count",
  auth.isAuthenticated,
  MaterialsController.unreadCount
);

router.post(
  "/mark-all-read",
  auth.isAuthenticated,
  MaterialsController.markAllRead
);

router.patch(
  "/:materialId/read",
  auth.isAuthenticated,
  MaterialsController.markRead
);

router.patch(
  "/:materialId/unread",
  auth.isAuthenticated,
  MaterialsController.markUnread
);

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
  handleUpload,

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
