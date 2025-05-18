const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../../public/uploads');
        
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Create a filename same as item name with '-' to replace spaces and lowercase it and and keep the original extension
        const itemName = req.body.name || 'item';
        const sanitizedFileName = itemName.replace(/\s+/g, '-').toLowerCase();
        const ext = path.extname(file.originalname);
        const uniqueFileName = `${sanitizedFileName}-${Date.now()}${ext}`;
        cb(null, uniqueFileName);
        // const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        // const ext = path.extname(file.originalname);
        // cb(null, uniqueSuffix + ext);
    }
});

// File filter to only accept image files
const fileFilter = (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed!'), false);
    }
};

// Export configured multer instance
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5 MB
    },
    fileFilter: fileFilter
});

module.exports = upload;