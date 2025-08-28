const { Materials, Meeting } = require('../models');
const { getFilePath, getFullFilePath, deleteFile } = require('../middleware/upload');
const path = require('path');
const fs = require('fs');

// Get materials by meeting ID
const getMaterialsByMeeting = async (req, res) => {
  try {
    const { meetingId } = req.params;
    
    const materials = await Materials.findAll({
      where: { 
        meetingId: meetingId,
        flag: 'Y'
      },
      order: [['created_at', 'ASC']]
    });

    res.json({
      success: true,
      message: 'Materials retrieved successfully',
      data: materials
    });
  } catch (error) {
    console.error('Error getting materials by meeting:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Upload file for material
const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const { meetingId } = req.params;
    const { originalname, filename, mimetype, size } = req.file;

    console.log('📁 Uploading file:', {
      meetingId,
      originalname,
      filename,
      mimetype,
      size
    });

    // Check if meeting exists
    const meeting = await Meeting.findByPk(meetingId);
    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found'
      });
    }

    // Generate the correct file path for database storage
    const dbFilePath = getFilePath(meetingId, filename);
    
    // Check if ANY material already exists for this meeting
    let material = await Materials.findOne({
      where: { 
        meetingId: meetingId,
        flag: 'Y'
      }
    });

    console.log('🔍 Material lookup result:', {
      found: !!material,
      meetingId,
      materialId: material?.id,
      existingPath: material?.path
    });

    if (material) {
      // Update existing material with new file info
      await material.update({ 
        path: dbFilePath,
        updated_at: new Date()
      });
      
      console.log('✅ Updated existing material:', {
        id: material.id,
        meetingId: material.meetingId,
        oldPath: material.path,
        newPath: dbFilePath
      });
    } else {
      // Create new material record
      console.log('🆕 Creating new material for:', originalname);
      material = await Materials.create({
        meetingId: meetingId,
        path: dbFilePath,
        flag: 'Y'
      });

      console.log('✅ Created new material:', {
        id: material.id,
        meetingId: material.meetingId,
        path: dbFilePath
      });
    }

    // Send response
    res.json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        id: material.id,
        meetingId: material.meetingId,
        path: dbFilePath,
        originalName: originalname,
        filename: filename,
        size: size,
        mimeType: mimetype
      }
    });

  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get single material by ID
const getMaterialById = async (req, res) => {
  try {
    const { materialId } = req.params;
    
    const material = await Materials.findByPk(materialId);
    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Material not found'
      });
    }

    res.json({
      success: true,
      message: 'Material retrieved successfully',
      data: material
    });
  } catch (error) {
    console.error('Error getting material by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Create new material (for file upload)
const createMaterial = async (req, res) => {
  try {
    const { meetingId, originalName, fileSize, mimeType } = req.body;
    
    if (!meetingId || !originalName) {
      return res.status(400).json({
        success: false,
        message: 'Meeting ID and original filename are required'
      });
    }

    // Check if meeting exists
    const meeting = await Meeting.findByPk(meetingId);
    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found'
      });
    }

    // Generate file path
    const filePath = getFilePath(meetingId, originalName);
    
    const material = await Materials.create({
      meetingId: meetingId,
      path: filePath,
      flag: 'Y'
    });

    console.log('✅ Material created:', {
      id: material.id,
      meetingId: material.meetingId,
      path: material.path
    });

    res.status(201).json({
      success: true,
      message: 'Material created successfully',
      data: material
    });
  } catch (error) {
    console.error('Error creating material:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Bulk create materials for a meeting
const bulkCreateMaterials = async (req, res) => {
  try {
    const { meetingId, materials } = req.body;
    
    if (!meetingId || !materials || !Array.isArray(materials)) {
      return res.status(400).json({
        success: false,
        message: 'Meeting ID and materials array are required'
      });
    }

    // Check if meeting exists
    const meeting = await Meeting.findByPk(meetingId);
    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found'
      });
    }

    const materialData = materials.map(material => ({
      meetingId: meetingId,
      path: getFilePath(meetingId, material.name || material.originalName),
      flag: 'Y'
    }));

    const createdMaterials = await Materials.bulkCreate(materialData);
    
    console.log(`✅ Created ${createdMaterials.length} materials for meeting ${meetingId}`);

    res.status(201).json({
      success: true,
      message: 'Materials created successfully',
      data: createdMaterials
    });
  } catch (error) {
    console.error('Error bulk creating materials:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Update material
const updateMaterial = async (req, res) => {
  try {
    const { materialId } = req.params;
    const { path: newPath } = req.body;
    
    const material = await Materials.findByPk(materialId);
    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Material not found'
      });
    }

    // Update the material
    await material.update({ path: newPath });

    res.json({
      success: true,
      message: 'Material updated successfully',
      data: material
    });
  } catch (error) {
    console.error('Error updating material:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Soft delete material
const deleteMaterial = async (req, res) => {
  try {
    const { materialId } = req.params;
    
    const material = await Materials.findByPk(materialId);
    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Material not found'
      });
    }

    // Soft delete
    await material.update({ flag: 'N' });

    // Optionally delete physical file
    // const fullPath = getFullFilePath(material.meetingId, path.basename(material.path));
    // deleteFile(fullPath);

    res.json({
      success: true,
      message: 'Material deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting material:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Restore soft-deleted material
const restoreMaterial = async (req, res) => {
  try {
    const { materialId } = req.params;
    
    const material = await Materials.findByPk(materialId);
    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Material not found'
      });
    }

    // Restore
    await material.update({ flag: 'Y' });

    res.json({
      success: true,
      message: 'Material restored successfully',
      data: material
    });
  } catch (error) {
    console.error('Error restoring material:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Download material file
const downloadMaterial = async (req, res) => {
  try {
    const { materialId } = req.params;
    
    const material = await Materials.findByPk(materialId);
    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Material not found'
      });
    }

    // Extract filename from the stored path
    const filename = path.basename(material.path);
    const meetingId = material.meetingId;
    
    // Get the full file path
    const fullPath = getFullFilePath(meetingId, filename);
    
    console.log('📥 Download request:', {
      materialId,
      meetingId,
      storedPath: material.path,
      filename,
      fullPath,
      exists: fs.existsSync(fullPath)
    });
    
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found on disk',
        details: {
          storedPath: material.path,
          fullPath: fullPath,
          filename: filename
        }
      });
    }

    // Set appropriate headers for download
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    
    // Send file for download
    res.download(fullPath, filename);
  } catch (error) {
    console.error('Error downloading material:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Clean up duplicate materials for a meeting
const cleanupDuplicateMaterials = async (req, res) => {
  try {
    const { meetingId } = req.params;
    
    if (!meetingId) {
      return res.status(400).json({
        success: false,
        message: 'Meeting ID is required'
      });
    }

    // Find all materials for the meeting
    const materials = await Materials.findAll({
      where: { 
        meetingId: meetingId,
        flag: 'Y'
      },
      order: [['created_at', 'ASC']]
    });

    console.log(`🔍 Found ${materials.length} materials for meeting ${meetingId}`);

    // Group materials by path to identify duplicates
    const pathGroups = {};
    materials.forEach(material => {
      const path = material.path;
      if (!pathGroups[path]) {
        pathGroups[path] = [];
      }
      pathGroups[path].push(material);
    });

    // Find duplicates (materials with same path)
    const duplicates = [];
    Object.entries(pathGroups).forEach(([path, materialsList]) => {
      if (materialsList.length > 1) {
        // Keep the first one, mark others for deletion
        const [keep, ...toDelete] = materialsList;
        duplicates.push({
          path,
          keep: keep.id,
          delete: toDelete.map(m => m.id)
        });
      }
    });

    if (duplicates.length === 0) {
      return res.json({
        success: true,
        message: 'No duplicate materials found',
        data: { materialsCount: materials.length, duplicatesCount: 0 }
      });
    }

    // Soft delete duplicate materials
    let deletedCount = 0;
    for (const duplicate of duplicates) {
      await Materials.update(
        { flag: 'N' },
        { 
          where: { 
            id: duplicate.delete,
            meetingId: meetingId 
          }
        }
      );
      deletedCount += duplicate.delete.length;
      console.log(`🗑️ Deleted ${duplicate.delete.length} duplicates for path: ${duplicate.path}`);
    }

    console.log(`✅ Cleaned up ${deletedCount} duplicate materials for meeting ${meetingId}`);

    res.json({
      success: true,
      message: 'Duplicate materials cleaned up successfully',
      data: {
        materialsCount: materials.length,
        duplicatesCount: duplicates.length,
        deletedCount: deletedCount
      }
    });

  } catch (error) {
    console.error('Error cleaning up duplicate materials:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Delete materials with "undefined" paths
const deleteUndefinedMaterials = async (req, res) => {
  try {
    const { meetingId } = req.params;
    
    if (!meetingId) {
      return res.status(400).json({
        success: false,
        message: 'Meeting ID is required'
      });
    }

    // Find materials with "undefined" path for this meeting
    const undefinedMaterials = await Materials.findAll({
      where: { 
        meetingId: meetingId,
        flag: 'Y',
        path: {
          [require('sequelize').Op.like]: '%undefined%'
        }
      }
    });

    if (undefinedMaterials.length === 0) {
      return res.json({
        success: true,
        message: 'No undefined materials found',
        data: { materialsCount: 0, deletedCount: 0 }
      });
    }

    console.log(`🔍 Found ${undefinedMaterials.length} undefined materials for meeting ${meetingId}:`, 
      undefinedMaterials.map(m => ({ id: m.id, path: m.path }))
    );

    // Soft delete undefined materials
    const materialIds = undefinedMaterials.map(m => m.id);
    await Materials.update(
      { flag: 'N' },
      { 
        where: { 
          id: materialIds,
          meetingId: meetingId 
        }
      }
    );

    console.log(`✅ Deleted ${undefinedMaterials.length} undefined materials for meeting ${meetingId}`);

    res.json({
      success: true,
      message: 'Undefined materials deleted successfully',
      data: {
        materialsCount: undefinedMaterials.length,
        deletedCount: undefinedMaterials.length,
        deletedIds: materialIds
      }
    });

  } catch (error) {
    console.error('Error deleting undefined materials:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Synchronize file paths for existing materials
const synchronizeFilePaths = async (req, res) => {
  try {
    const { meetingId } = req.params;
    
    if (!meetingId) {
      return res.status(400).json({
        success: false,
        message: 'Meeting ID is required'
      });
    }

    // Find all materials for the meeting
    const materials = await Materials.findAll({
      where: { 
        meetingId: meetingId,
        flag: 'Y'
      }
    });

    if (materials.length === 0) {
      return res.json({
        success: true,
        message: 'No materials found for this meeting',
        data: { materialsCount: 0, updatedCount: 0 }
      });
    }

    console.log(`🔍 Found ${materials.length} materials for meeting ${meetingId}`);

    let updatedCount = 0;
    const results = [];

    for (const material of materials) {
      try {
        // Check if the stored path is correct
        const currentPath = material.path;
        const filename = path.basename(currentPath);
        
        // Generate the correct path
        const correctPath = getFilePath(meetingId, filename);
        
        if (currentPath !== correctPath) {
          // Update the material with correct path
          await material.update({ path: correctPath });
          updatedCount++;
          
          results.push({
            id: material.id,
            oldPath: currentPath,
            newPath: correctPath,
            status: 'updated'
          });
          
          console.log(`✅ Updated material ${material.id}: ${currentPath} → ${correctPath}`);
        } else {
          results.push({
            id: material.id,
            path: currentPath,
            status: 'already_correct'
          });
        }
      } catch (error) {
        console.error(`❌ Error processing material ${material.id}:`, error);
        results.push({
          id: material.id,
          path: material.path,
          status: 'error',
          error: error.message
        });
      }
    }

    console.log(`✅ Synchronized ${updatedCount} out of ${materials.length} materials for meeting ${meetingId}`);

    res.json({
      success: true,
      message: 'File paths synchronized successfully',
      data: {
        materialsCount: materials.length,
        updatedCount: updatedCount,
        results: results
      }
    });

  } catch (error) {
    console.error('Error synchronizing file paths:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

module.exports = {
  getMaterialsByMeeting,
  getMaterialById,
  createMaterial,
  bulkCreateMaterials,
  updateMaterial,
  deleteMaterial,
  restoreMaterial,
  downloadMaterial,
  uploadFile,
  cleanupDuplicateMaterials,
  deleteUndefinedMaterials,
  synchronizeFilePaths
};
