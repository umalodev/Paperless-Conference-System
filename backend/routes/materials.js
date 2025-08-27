const express = require('express');
const router = express.Router();
const MaterialsController = require('../controllers/materialsController');
const { authenticateToken } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

// Get materials by meeting ID
router.get('/meeting/:meetingId', authenticateToken, MaterialsController.getMaterialsByMeeting);

// Get single material by ID
router.get('/:materialId', authenticateToken, MaterialsController.getMaterialById);

// Create new material (for file upload)
router.post('/', authenticateToken, MaterialsController.createMaterial);

// Upload file for material
router.post('/upload/:meetingId', authenticateToken, upload.single('file'), MaterialsController.uploadFile);

// Bulk create materials for a meeting
router.post('/bulk', authenticateToken, MaterialsController.bulkCreateMaterials);

// Update material
router.put('/:materialId', authenticateToken, MaterialsController.updateMaterial);

// Soft delete material
router.delete('/:materialId', authenticateToken, MaterialsController.deleteMaterial);

// Restore soft-deleted material
router.patch('/:materialId/restore', authenticateToken, MaterialsController.restoreMaterial);

// Download material file
router.get('/:materialId/download', authenticateToken, MaterialsController.downloadMaterial);

// Clean up duplicate materials for a meeting
router.post('/cleanup/:meetingId', authenticateToken, MaterialsController.cleanupDuplicateMaterials);

// Delete materials with "undefined" paths
router.post('/delete-undefined/:meetingId', authenticateToken, MaterialsController.deleteUndefinedMaterials);

module.exports = router;
