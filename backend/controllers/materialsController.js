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

    // Create material record
    const material = await createMaterial({
      body: {
        meetingId: meetingId,
        originalName: originalname,
        fileSize: size,
        mimeType: mimetype
      }
    }, res);

    // Update the file path to include the actual uploaded filename
    if (material && material.data) {
      const { getFilePath } = require('../middleware/upload');
      const actualPath = getFilePath(meetingId, filename);
      
      await material.data.update({ path: actualPath });
      
      res.json({
        success: true,
        message: 'File uploaded successfully',
        data: {
          id: material.data.id,
          meetingId: material.data.meetingId,
          path: actualPath,
          originalName: originalname,
          filename: filename,
          size: size,
          mimeType: mimetype
        }
      });
    }

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

    const fullPath = getFullFilePath(material.meetingId, path.basename(material.path));
    
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found on disk'
      });
    }

    // Send file for download
    res.download(fullPath);
  } catch (error) {
    console.error('Error downloading material:', error);
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
  uploadFile
};
