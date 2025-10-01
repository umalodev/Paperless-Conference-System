const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "../uploads/materials");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Create meeting-specific folder - get meetingId from params since route is /upload/:meetingId
    const meetingId = req.params.meetingId || req.body.meetingId || "temp";
    const meetingDir = path.join(uploadsDir, meetingId.toString());

    if (!fs.existsSync(meetingDir)) {
      fs.mkdirSync(meetingDir, { recursive: true });
    }

    cb(null, meetingDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = path
      .basename(file.originalname, ext)
      .replace(/[^\w\-]+/g, "_")
      .replace(/_+/g, "_")
      .slice(0, 50); // Reduced from 80 to leave more space for timestamp

    // Generate unique timestamp + random string to ensure uniqueness
    const timestamp = Date.now();
    const random = crypto.randomBytes(4).toString("hex"); // 8 character hex
    const uniqueSuffix = `${timestamp}_${random}`;

    // Final filename: originalbase_timestamp_random.ext
    const finalFilename = `${base}_${uniqueSuffix}${ext}`;

    console.log(
      `📁 Generated filename: ${finalFilename} for original: ${file.originalname}`
    );

    cb(null, finalFilename);
  },
});

// File filter
const fileFilter = (req, file, cb) => {
  // Allow common document and media types
  const allowedTypes = [
    // Documents
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    "text/csv",
    // Images
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/bmp",
    // Archives
    "application/zip",
    "application/x-rar-compressed",
    "application/x-7z-compressed",
    // Video
    "video/mp4",
    "video/avi",
    "video/mov",
    "video/wmv",
    // Audio
    "audio/mp3",
    "audio/wav",
    "audio/ogg",
  ];

  console.log(`🔍 File filter check: ${file.originalname} (${file.mimetype})`);

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    console.log(`❌ File type ${file.mimetype} not allowed`);
    cb(
      new Error(
        `File type ${
          file.mimetype
        } not allowed. Allowed types: ${allowedTypes.join(", ")}`
      ),
      false
    );
  }
};

// Configure multer with multiple files support
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 200 * 1024 * 1024, // 200MB max file size per file
    files: 20, // Increased max files per upload from 10 to 20
  },
});

// Helper function to get file path for database (relative path)
const getFilePath = (meetingId, filename) => {
  return `uploads/materials/${meetingId}/${filename}`;
};

// Helper function to get full file path (absolute path)
const getFullFilePath = (meetingId, filename) => {
  return path.join(
    __dirname,
    "../uploads/materials",
    meetingId.toString(),
    filename
  );
};

// Helper function to delete file
const deleteFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`🗑️ Deleted file: ${filePath}`);
      return true;
    }
    console.log(`⚠️ File not found for deletion: ${filePath}`);
    return false;
  } catch (error) {
    console.error("❌ Error deleting file:", error);
    return false;
  }
};

// Helper function to ensure meeting directory exists
const ensureMeetingDir = (meetingId) => {
  const meetingDir = path.join(uploadsDir, meetingId.toString());
  if (!fs.existsSync(meetingDir)) {
    fs.mkdirSync(meetingDir, { recursive: true });
    console.log(`📁 Created meeting directory: ${meetingDir}`);
  }
  return meetingDir;
};

// Helper function to check if file exists
const fileExists = (meetingId, filename) => {
  const fullPath = getFullFilePath(meetingId, filename);
  return fs.existsSync(fullPath);
};

// Helper function to get file stats
const getFileStats = (meetingId, filename) => {
  try {
    const fullPath = getFullFilePath(meetingId, filename);
    if (fs.existsSync(fullPath)) {
      return fs.statSync(fullPath);
    }
    return null;
  } catch (error) {
    console.error("Error getting file stats:", error);
    return null;
  }
};

module.exports = {
  upload,
  getFilePath,
  getFullFilePath,
  deleteFile,
  ensureMeetingDir,
  fileExists,
  getFileStats,
};
