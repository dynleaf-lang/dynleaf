const express = require('express');
const router = express.Router();
const upload = require('../utils/imageUpload');
const path = require('path');
const fs = require('fs');

// Route to handle image uploads
router.post('/', upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        // Create full URL to access the image
        const host = req.get('host');
        const protocol = req.protocol;
        const imageUrl = `${protocol}://${host}/uploads/${req.file.filename}`;

        res.json({
            success: true,
            file: {
                filename: req.file.filename,
                originalname: req.file.originalname,
                size: req.file.size,
                mimetype: req.file.mimetype,
                path: req.file.path,
                url: imageUrl
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Route to delete an image file
router.delete('/:filename', (req, res) => {
    try {
        const { filename } = req.params;
        
        // Check if the filename is valid and not trying to access parent directories
        if (!filename || filename.includes('..')) {
            return res.status(400).json({
                success: false,
                message: 'Invalid filename'
            });
        }
        
        const filePath = path.join(__dirname, '../../public/uploads', filename);
        
        // Check if file exists
        if (fs.existsSync(filePath)) {
            // Delete the file
            fs.unlinkSync(filePath);
            return res.json({
                success: true,
                message: 'File deleted successfully'
            });
        } else {
            return res.status(404).json({
                success: false,
                message: 'File not found'
            });
        }
    } catch (error) {
        console.error('Error deleting file:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;