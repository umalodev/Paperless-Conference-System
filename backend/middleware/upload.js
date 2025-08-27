const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads/materials');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Create meeting-specific folder
    const meetingId = req.body.meetingId || 'temp';
    const meetingDir = path.join(uploadsDir, meetingId.toString());
    
    if (!fs.existsSync(meetingDir)) {
      fs.mkdirSync(meetingDir, { recursive: true });
    }
    
    cb(null, meetingDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename: timestamp_originalname
    const timestamp = Date.now();
    const originalName = file.originalname;
    const extension = path.extname(originalName);
    const nameWithoutExt = path.basename(originalName, extension);
    
    // Clean filename (remove special characters)
    const cleanName = nameWithoutExt.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `${timestamp}_${cleanName}${extension}`;
    
    cb(null, filename);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  // Allow common document and media types
  const allowedTypes = [
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    
    // Images
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    
    // Archives
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} not allowed. Allowed types: ${allowedTypes.join(', ')}`), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
    files: 10 // Max 10 files per upload
  }
});

// Helper function to get file path for database
const getFilePath = (meetingId, filename) => {
  return `uploads/materials/${meetingId}/${filename}`;
};

// Helper function to get full file path
const getFullFilePath = (meetingId, filename) => {
  return path.join(__dirname, '../uploads/materials', meetingId.toString(), filename);
};

// Helper function to delete file
const deleteFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
};

module.exports = {
  upload,
  getFilePath,
  getFullFilePath,
  deleteFile
};
