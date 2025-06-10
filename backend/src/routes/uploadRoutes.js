const express = require('express');
const router = express.Router();
const upload = require('../utils/imageUpload');
const path = require('path');
const fs = require('fs');

// Route to handle image uploads
router.post('/', (req, res) => {
    // Log details about the incoming request
    console.log('Upload request received');
    console.log('Content-Type:', req.headers['content-type']);
    console.log('Request body before processing:', req.body ? Object.keys(req.body) : 'No body');
    
    // Use the multer upload middleware manually
    upload.single('image')(req, res, function(err) {
        try {
            // Handle multer errors
            if (err) {
                console.error('Multer error:', err);
                return res.status(400).json({ 
                    success: false, 
                    message: err.message || 'Error uploading file' 
                });
            }
            
            console.log('File received:', req.file ? 'Yes' : 'No');
            
            // Handle case where no file was provided
            if (!req.file) {
                console.log('Request body after processing:', req.body ? Object.keys(req.body) : 'No body');
                return res.status(400).json({ 
                    success: false, 
                    message: 'No file uploaded. The "image" field must contain a file.' 
                });
            }
            
            // Log file details for debugging
            console.log('File details:', {
                filename: req.file.filename,
                originalname: req.file.originalname,
                size: req.file.size,
                mimetype: req.file.mimetype
            });

            // Create full URL to access the image
            const host = req.get('host');
            const protocol = req.protocol;
            const imageUrl = `${protocol}://${host}/uploads/${req.file.filename}`;

            // Send successful response
            res.status(200).json({
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
            console.error('Error in upload handler:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Server error during file upload'
            });
        }
    });
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