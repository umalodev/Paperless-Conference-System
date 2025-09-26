const { Materials, Meeting } = require("../models");
const {
  getFilePath,
  getFullFilePath,
  deleteFile,
} = require("../middleware/upload");
const path = require("path");
const fs = require("fs");
const { Op } = require("sequelize");
const { get } = require("http");

// Get materials by meeting ID
const getMaterialsByMeeting = async (req, res) => {
  try {
    const { meetingId } = req.params;

    const materials = await Materials.findAll({
      where: {
        meetingId: meetingId,
        flag: "Y",
      },
      order: [["created_at", "ASC"]],
    });

    res.json({
      success: true,
      message: "Materials retrieved successfully",
      data: materials,
    });
  } catch (error) {
    console.error("Error getting materials by meeting:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

const uploadFile = async (req, res) => {
  try {
    // Handle both single and multiple files
    const files = req.files || (req.file ? [req.file] : []);

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No files uploaded",
      });
    }

    const { meetingId } = req.params;

    if (!meetingId) {
      return res.status(400).json({
        success: false,
        message: "Meeting ID is required",
      });
    }

    // Pastikan meeting ada
    const meeting = await Meeting.findByPk(meetingId);
    if (!meeting) {
      // Clean up uploaded files if meeting doesn't exist
      files.forEach((file) => {
        const fullPath = getFullFilePath(meetingId, file.filename);
        deleteFile(fullPath);
      });

      return res.status(404).json({
        success: false,
        message: "Meeting not found",
      });
    }

    const uploadedMaterials = [];
    const errors = [];

    // Process each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const { originalname, filename, mimetype, size } = file;

      try {
        console.log(
          `📄 Processing file ${i + 1}/${files.length}: ${originalname}`
        );

        // Path untuk disimpan ke DB
        const dbFilePath = getFilePath(meetingId, filename);

        // Verify file exists on disk
        const fullPath = getFullFilePath(meetingId, filename);
        if (!fs.existsSync(fullPath)) {
          throw new Error(`File not found on disk: ${fullPath}`);
        }

        // SELALU BUAT RECORD BARU (tidak replace yang lama)
        const material = await Materials.create({
          meetingId,
          path: dbFilePath,
          flag: "Y",
        });

        uploadedMaterials.push({
          id: material.id,
          meetingId: material.meetingId,
          path: material.path,
          originalName: originalname,
          filename,
          size,
          mimeType: mimetype,
          uploadedAt: material.createdAt || new Date(),
        });
      } catch (fileError) {
        // Clean up file if database insert failed
        const fullPath = getFullFilePath(meetingId, file.filename);
        deleteFile(fullPath);

        errors.push({
          filename: originalname,
          error: fileError.message,
        });
      }
    }

    // Return response based on results
    if (uploadedMaterials.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No files were uploaded successfully",
        errors: errors,
      });
    }

    if (errors.length > 0) {
      // Partial success
      return res.status(207).json({
        // 207 Multi-Status
        success: true,
        message: `${uploadedMaterials.length} files uploaded successfully, ${errors.length} failed`,
        data: uploadedMaterials,
        errors: errors,
      });
    }

    // Complete success
    return res.json({
      success: true,
      message: `${uploadedMaterials.length} file(s) uploaded successfully`,
      data: uploadedMaterials,
    });
  } catch (error) {
    // Clean up any uploaded files on general error
    if (req.files || req.file) {
      const files = req.files || [req.file];
      files.forEach((file) => {
        if (file && file.filename) {
          const fullPath = getFullFilePath(req.params.meetingId, file.filename);
          deleteFile(fullPath);
        }
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error during upload",
      error: error.message,
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
        message: "Material not found",
      });
    }

    res.json({
      success: true,
      message: "Material retrieved successfully",
      data: material,
    });
  } catch (error) {
    console.error("Error getting material by ID:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
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
        message: "Meeting ID and original filename are required",
      });
    }

    // Check if meeting exists
    const meeting = await Meeting.findByPk(meetingId);
    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: "Meeting not found",
      });
    }

    // Generate file path
    const filePath = getFilePath(meetingId, originalName);

    const material = await Materials.create({
      meetingId: meetingId,
      path: filePath,
      flag: "Y",
    });

    res.status(201).json({
      success: true,
      message: "Material created successfully",
      data: material,
    });
  } catch (error) {
    console.error("Error creating material:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
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
        message: "Meeting ID and materials array are required",
      });
    }

    // Check if meeting exists
    const meeting = await Meeting.findByPk(meetingId);
    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: "Meeting not found",
      });
    }

    const materialData = materials.map((material) => ({
      meetingId: meetingId,
      path: getFilePath(meetingId, material.name || material.originalName),
      flag: "Y",
    }));

    const createdMaterials = await Materials.bulkCreate(materialData);

    res.status(201).json({
      success: true,
      message: "Materials created successfully",
      data: createdMaterials,
    });
  } catch (error) {
    console.error("Error bulk creating materials:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
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
        message: "Material not found",
      });
    }

    // Update the material
    await material.update({ path: newPath });

    res.json({
      success: true,
      message: "Material updated successfully",
      data: material,
    });
  } catch (error) {
    console.error("Error updating material:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
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
        message: "Material not found",
      });
    }

    // Soft delete
    await material.update({ flag: "N" });

    // Optionally delete physical file
    // const fullPath = getFullFilePath(material.meetingId, path.basename(material.path));
    // deleteFile(fullPath);

    res.json({
      success: true,
      message: "Material deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting material:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
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
        message: "Material not found",
      });
    }

    // Restore
    await material.update({ flag: "Y" });

    res.json({
      success: true,
      message: "Material restored successfully",
      data: material,
    });
  } catch (error) {
    console.error("Error restoring material:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
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
        message: "Material not found",
      });
    }

    // Extract filename from the stored path
    const filename = path.basename(material.path);
    const meetingId = material.meetingId;

    // Get the full file path
    const fullPath = getFullFilePath(meetingId, filename);

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({
        success: false,
        message: "File not found on disk",
        details: {
          storedPath: material.path,
          fullPath: fullPath,
          filename: filename,
        },
      });
    }

    // Set appropriate headers for download
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", "application/octet-stream");

    // Send file for download
    res.download(fullPath, filename);
  } catch (error) {
    console.error("Error downloading material:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
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
        message: "Meeting ID is required",
      });
    }

    // Find all materials for the meeting
    const materials = await Materials.findAll({
      where: {
        meetingId: meetingId,
        flag: "Y",
      },
      order: [["created_at", "ASC"]],
    });

    // Group materials by path to identify duplicates
    const pathGroups = {};
    materials.forEach((material) => {
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
          delete: toDelete.map((m) => m.id),
        });
      }
    });

    if (duplicates.length === 0) {
      return res.json({
        success: true,
        message: "No duplicate materials found",
        data: { materialsCount: materials.length, duplicatesCount: 0 },
      });
    }

    // Soft delete duplicate materials
    let deletedCount = 0;
    for (const duplicate of duplicates) {
      await Materials.update(
        { flag: "N" },
        {
          where: {
            id: duplicate.delete,
            meetingId: meetingId,
          },
        }
      );
      deletedCount += duplicate.delete.length;
    }

    res.json({
      success: true,
      message: "Duplicate materials cleaned up successfully",
      data: {
        materialsCount: materials.length,
        duplicatesCount: duplicates.length,
        deletedCount: deletedCount,
      },
    });
  } catch (error) {
    console.error("Error cleaning up duplicate materials:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
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
        message: "Meeting ID is required",
      });
    }

    // Find materials with "undefined" path for this meeting
    const undefinedMaterials = await Materials.findAll({
      where: {
        meetingId: meetingId,
        flag: "Y",
        path: {
          [require("sequelize").Op.like]: "%undefined%",
        },
      },
    });

    if (undefinedMaterials.length === 0) {
      return res.json({
        success: true,
        message: "No undefined materials found",
        data: { materialsCount: 0, deletedCount: 0 },
      });
    }

    // Soft delete undefined materials
    const materialIds = undefinedMaterials.map((m) => m.id);
    await Materials.update(
      { flag: "N" },
      {
        where: {
          id: materialIds,
          meetingId: meetingId,
        },
      }
    );

    res.json({
      success: true,
      message: "Undefined materials deleted successfully",
      data: {
        materialsCount: undefinedMaterials.length,
        deletedCount: undefinedMaterials.length,
        deletedIds: materialIds,
      },
    });
  } catch (error) {
    console.error("Error deleting undefined materials:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
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
        message: "Meeting ID is required",
      });
    }

    // Find all materials for the meeting
    const materials = await Materials.findAll({
      where: {
        meetingId: meetingId,
        flag: "Y",
      },
    });

    if (materials.length === 0) {
      return res.json({
        success: true,
        message: "No materials found for this meeting",
        data: { materialsCount: 0, updatedCount: 0 },
      });
    }

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
            status: "updated",
          });
        } else {
          results.push({
            id: material.id,
            path: currentPath,
            status: "already_correct",
          });
        }
      } catch (error) {
        console.error(`❌ Error processing material ${material.id}:`, error);
        results.push({
          id: material.id,
          path: material.path,
          status: "error",
          error: error.message,
        });
      }
    }

    res.json({
      success: true,
      message: "File paths synchronized successfully",
      data: {
        materialsCount: materials.length,
        updatedCount: updatedCount,
        results: results,
      },
    });
  } catch (error) {
    console.error("Error synchronizing file paths:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

const getMaterialsHistory = async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const excludeMeetingId = req.query.excludeMeetingId
      ? Number(req.query.excludeMeetingId)
      : null;
    const withMaterialsOnly =
      String(req.query.withMaterialsOnly || "1") === "1";

    // Ambil meeting yang aktif (flag=Y), diurutkan terbaru (start_time desc)
    const whereMeeting = { flag: "Y" };
    if (excludeMeetingId)
      whereMeeting.meetingId = { [Op.ne]: excludeMeetingId };

    const meetings = await Meeting.findAll({
      where: whereMeeting,
      order: [["startTime", "DESC"]],
      limit,
      attributes: ["meetingId", "title", "startTime", "endTime", "status"],
      include: [
        {
          model: Materials,
          as: "Materials",
          required: withMaterialsOnly ? true : false,
          where: { flag: "Y" },
          attributes: ["id", "path", "created_at"],
          separate: true,
          order: [["created_at", "DESC"]],
        },
      ],
    });

    // Normalisasi respons
    const data = meetings.map((m) => ({
      meetingId: m.meetingId,
      title: m.title,
      startTime: m.startTime,
      endTime: m.endTime,
      status: m.status,
      materials: (m.Materials || []).map((it) => ({
        id: it.id,
        path: it.path,
        created_at: it.created_at,
      })),
    }));

    return res.json({
      success: true,
      message: "Materials history retrieved successfully",
      data,
    });
  } catch (error) {
    console.error("Error getting materials history:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
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
  synchronizeFilePaths,
  getMaterialsHistory,
};
