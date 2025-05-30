const User = require('../models/User');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Configure multer for profile photo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../public/uploads/profiles');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename using userId and timestamp
    const userId = req.user.id;
    const timestamp = Date.now();
    const fileExt = path.extname(file.originalname).toLowerCase();
    cb(null, `profile-${userId}-${timestamp}${fileExt}`);
  }
});

// File filter to only allow image files
const fileFilter = (req, file, cb) => {
  const allowedFileTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedFileTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

// Create multer upload instance
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max file size
  },
  fileFilter: fileFilter
});

// Helper function to get user profile
const getUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Ensure response includes isEmailVerified field
    const userData = user.toObject();
    if (userData.isEmailVerified === undefined) {
      userData.isEmailVerified = false; // Provide default if missing
    }
    
    res.status(200).json({ user: userData });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update user profile
const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      username,
      firstName,
      lastName,
      email,
      address,
      city,
      country,
      postalCode,
      aboutMe
    } = req.body;

    // Find user by ID
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if username is being changed and if it's unique
    if (username && username !== user.username) {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({ message: 'Username already taken' });
      }
    }

    // Check if email is being changed and if it's unique
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already registered' });
      }
    }

    // Update user fields
    user.username = username || user.username;
    user.firstName = firstName || user.firstName;
    user.lastName = lastName || user.lastName;
    user.email = email || user.email;
    user.address = address || user.address;
    user.city = city || user.city;
    user.country = country || user.country;
    user.postalCode = postalCode || user.postalCode;
    user.aboutMe = aboutMe || user.aboutMe;

    // Save the updated user
    const updatedUser = await user.save();

    // Return the updated user without password
    res.status(200).json({ 
      message: 'Profile updated successfully',
      user: {
        id: updatedUser._id,
        username: updatedUser.username,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        address: updatedUser.address,
        city: updatedUser.city,
        country: updatedUser.country,
        postalCode: updatedUser.postalCode,
        aboutMe: updatedUser.aboutMe,
        role: updatedUser.role,
        restaurantId: updatedUser.restaurantId,
        branchId: updatedUser.branchId,
        profilePhoto: updatedUser.profilePhoto,
        isEmailVerified: updatedUser.isEmailVerified
      } 
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Upload profile photo
const uploadProfilePhoto = async (req, res) => {
  try {
    // Create a single file upload handler
    const uploadSingle = (req, res) => {
      return new Promise((resolve, reject) => {
        const singleUpload = upload.single('profilePhoto');
        
        singleUpload(req, res, (err) => {
          if (err) {
            console.error('Multer upload error:', err);
            return reject(err);
          }
          return resolve();
        });
      });
    };
    
    // Execute the upload
    await uploadSingle(req, res);
    
    // Check if file was received
    if (!req.file) {
      console.error('No file received in request');
      return res.status(400).json({ message: 'Please upload a file' });
    }

    console.log('File uploaded successfully:', req.file);
    
    const userId = req.user.id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Delete previous profile photo if exists
    if (user.profilePhoto) {
      try {
        const previousPhotoPath = path.join(__dirname, '../../public', user.profilePhoto);
        if (fs.existsSync(previousPhotoPath)) {
          fs.unlinkSync(previousPhotoPath);
          console.log('Previous profile photo deleted');
        }
      } catch (error) {
        console.error('Error deleting previous profile photo:', error);
      }
    }

    // Set new photo URL (relative path from public directory)
    const photoUrl = `/uploads/profiles/${req.file.filename}`;
    user.profilePhoto = photoUrl;
    await user.save();

    console.log('Profile photo URL saved to user:', photoUrl);

    res.status(200).json({ 
      message: 'Profile photo updated successfully',
      photoUrl 
    });
  } catch (error) {
    console.error('Error uploading profile photo:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

// Delete profile photo
const deleteProfilePhoto = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user has a profile photo
    if (!user.profilePhoto) {
      return res.status(400).json({ message: 'No profile photo to delete' });
    }

    // Delete profile photo file
    try {
      const photoPath = path.join(__dirname, '../../public', user.profilePhoto);
      if (fs.existsSync(photoPath)) {
        fs.unlinkSync(photoPath);
        console.log('Profile photo file deleted:', photoPath);
      }
    } catch (error) {
      console.error('Error deleting profile photo file:', error);
      // Continue even if file deletion fails
    }

    // Remove profile photo from user record
    user.profilePhoto = null;
    await user.save();

    res.status(200).json({ 
      message: 'Profile photo deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting profile photo:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

// Simple endpoint to check if user account is still active
const checkAccountStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select('status isDeleted');
    
    if (!user) {
      return res.status(401).json({ 
        message: 'Your account has been suspended by admin',
        reason: 'account_suspended'
      });
    }
    
    // Check if user account is inactive or deleted
    if (user.status === 'inactive' || user.isDeleted) {
      return res.status(401).json({ 
        message: 'Your account has been suspended by admin',
        reason: 'account_suspended'
      });
    }
    
    // If we get here, the account is active
    res.status(200).json({ 
      message: 'Account is active',
      status: 'active'
    });
  } catch (error) {
    console.error('Error checking account status:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Change password for authenticated user
const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }

    // Password strength validation
    const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*]).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character'
      });
    }

    // Find user by ID
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if current password is correct
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    
    // Update password updated timestamp
    user.passwordUpdatedAt = Date.now();

    await user.save();

    res.status(200).json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create a reusable transporter object for sending emails
const createEmailTransporter = () => {
  // For production, use environment variables for these settings
  // For development, you might use services like Mailtrap, Gmail, or SendGrid
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: process.env.EMAIL_SECURE === 'true' || false,
    auth: {
      user: process.env.EMAIL_USER || 'your-email@example.com',
      pass: process.env.EMAIL_PASS || 'your-email-password'
    },
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === 'production'
    }
  });
};

// Generate OTP code (6 digits)
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Start forgot password process (request OTP)
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Validate input
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Find user by email
    const user = await User.findOne({ email });
    
    // For security reasons, don't indicate if email exists or not
    if (!user) {
      return res.status(200).json({ message: 'If your email is registered, you will receive a verification code.' });
    }

    // Generate OTP
    const otp = generateOTP();
    
    // Set OTP expiry time (10 minutes)
    const otpExpiry = Date.now() + 10 * 60 * 1000;

    // Save OTP and expiry time to user document
    user.resetPasswordOTP = otp;
    user.resetPasswordOTPExpiry = otpExpiry;
    await user.save();

    // Send OTP via email
    const transporter = createEmailTransporter();
    
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"Order Ease" <your-email@example.com>',
      to: email,
      subject: 'Password Reset Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #ff9800;">Order Ease</h2>
            <p style="font-size: 18px;">Password Reset Verification Code</p>
          </div>
          
          <p>Hello,</p>
          
          <p>We received a request to reset your password. Please use the verification code below to complete the process:</p>
          
          <div style="background-color: #f5f5f5; padding: 15px; text-align: center; margin: 20px 0; border-radius: 5px;">
            <h1 style="letter-spacing: 5px; font-family: monospace; margin: 0; color: #333;">${otp}</h1>
          </div>
          
          <p>This code is valid for 10 minutes. If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
          
          <p>Thank you,<br>The Order Ease Team</p>
          
          <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #777; font-size: 12px;">
            <p>This is an automated email, please do not reply.</p>
          </div>
        </div>
      `
    });

    res.status(200).json({ message: 'Verification code sent to your email' });
  } catch (error) {
    console.error('Error in forgot password process:', error);
    res.status(500).json({ message: 'Failed to send verification code. Please try again later.' });
  }
};

// Verify OTP for password reset
const verifyResetOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Validate input
    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and verification code are required' });
    }

    // Find user by email
    const user = await User.findOne({ email });
    
    // For security, use consistent error messages
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired verification code' });
    }

    // Check if OTP exists and is not expired
    if (!user.resetPasswordOTP || !user.resetPasswordOTPExpiry) {
      return res.status(400).json({ message: 'No verification code was requested or it has expired' });
    }

    // Check if OTP is expired
    if (Date.now() > user.resetPasswordOTPExpiry) {
      return res.status(400).json({ message: 'Verification code has expired' });
    }

    // Check if OTP matches
    if (user.resetPasswordOTP !== otp) {
      return res.status(400).json({ message: 'Invalid verification code' });
    }

    // OTP is valid
    res.status(200).json({ message: 'Verification code is valid' });
  } catch (error) {
    console.error('Error verifying reset OTP:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Reset password with OTP
const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    // Validate input
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: 'Email, verification code, and new password are required' });
    }

    // Password strength validation
    const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*]).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character'
      });
    }

    // Find user by email
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired verification code' });
    }

    // Check if OTP exists and is not expired
    if (!user.resetPasswordOTP || !user.resetPasswordOTPExpiry) {
      return res.status(400).json({ message: 'No verification code was requested or it has expired' });
    }

    // Check if OTP is expired
    if (Date.now() > user.resetPasswordOTPExpiry) {
      return res.status(400).json({ message: 'Verification code has expired' });
    }

    // Check if OTP matches
    if (user.resetPasswordOTP !== otp) {
      return res.status(400).json({ message: 'Invalid verification code' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    
    // Update password updated timestamp
    user.passwordUpdatedAt = Date.now();
    
    // Clear OTP fields
    user.resetPasswordOTP = undefined;
    user.resetPasswordOTPExpiry = undefined;

    await user.save();

    res.status(200).json({ message: 'Password has been reset successfully' });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getUserProfile,
  updateUserProfile,
  uploadProfilePhoto,
  deleteProfilePhoto,
  checkAccountStatus,
  upload, // Export multer upload for route middleware
  changePassword,
  forgotPassword,
  verifyResetOTP,
  resetPassword
};