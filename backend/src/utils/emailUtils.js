const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Configure email transporter based on provider type
const createTransporter = () => {
 

  // Get email provider type from environment variables
  const provider = process.env.EMAIL_PROVIDER?.toLowerCase() || 'business';
  console.log(`Using email provider: ${provider}`);
  
  let config = {};
  
  // Select configuration based on provider
  if (provider === 'gmail') { 
    config = {
      service: 'gmail',
      host: process.env.GMAIL_EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.GMAIL_EMAIL_PORT || '587'),
      secure: process.env.GMAIL_EMAIL_SECURE === 'true',
      auth: {
        user: process.env.GMAIL_EMAIL_USER,
        pass: process.env.GMAIL_EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false
      }
    };
  } else {
    // Default to business email
    console.log('Using Business SMTP configuration');
    config = {
      host: process.env.BUSINESS_EMAIL_HOST,
      port: parseInt(process.env.BUSINESS_EMAIL_PORT || '465'),
      secure: process.env.BUSINESS_EMAIL_SECURE !== 'false', // Default to true for port 465
      auth: {
        user: process.env.BUSINESS_EMAIL_USER,
        pass: process.env.BUSINESS_EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: true
      }
    };
  }
  
  // Log configuration for debugging (hiding password)
  console.log(`Email Configuration:`, {
    provider,
    host: config.host,
    port: config.port,
    secure: config.secure,
    user: config.auth.user
  });
  
  return nodemailer.createTransport(config);
};

let transporter;
try {
  transporter = createTransporter();
  
  // Verify transporter connection on startup
  transporter.verify(function(error, success) {
    if (error) {
      console.error('SMTP connection error:', error);
      console.error('Please check your email configuration in .env file');
    } else {
      console.log('Email server is ready to send messages');
    }
  });
} catch (err) {
  console.error('Failed to create email transporter:', err);
}

/**
 * Generate a random OTP
 * @returns {string} - 6-digit OTP
 */
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Generate a JWT token
 * @param {Object} payload - Payload to include in token
 * @returns {string} - JWT token
 */
const generateToken = (payload) => {
  const jwt = require('jsonwebtoken');
  return jwt.sign(payload, process.env.JWT_SECRET || 'your-secret-key', {
    expiresIn: '1h',
  });
};

/**
 * Send verification email with OTP
 * @param {string} email - Recipient email
 * @param {string} otp - One-time password to send
 * @returns {Promise} - Email send result
 */
const sendVerificationEmail = async (email, otp) => {
  try {
    const provider = process.env.EMAIL_PROVIDER?.toLowerCase() || 'business';
    const fromEmail = provider === 'gmail' 
      ? process.env.GMAIL_EMAIL_FROM || '"OrderEase System" <no-reply@orderease.com>'
      : process.env.BUSINESS_EMAIL_FROM || '"OrderEase System" <no-reply@orderease.com>';
    
    if (!transporter) {
      console.log('Email transporter not initialized, recreating...');
      transporter = createTransporter();
    }
    
    const mailOptions = {
      from: fromEmail,
      to: email,
      subject: 'Verify Your Email Address',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #3498db;">OrderEase</h1>
            <h2>Email Verification Code</h2>
          </div>
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px;">
            <p>Hello,</p>
            <p>Thank you for registering with OrderEase. Please use the verification code below to complete your registration:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <div style="font-size: 32px; letter-spacing: 5px; font-weight: bold; background: #e9ecef; padding: 10px; border-radius: 5px;">
                ${otp}
              </div>
            </div>
            
            <p>This code will expire in 10 minutes.</p>
            <p>If you didn't request this verification, please ignore this email or contact our support team if you have concerns.</p>
          </div>
          <div style="margin-top: 20px; text-align: center; font-size: 12px; color: #6c757d;">
            <p>This is an automated message, please do not reply to this email.</p>
          </div>
        </div>
      `,
    };

    console.log(`Attempting to send verification email to: ${email}`);
    const result = await transporter.sendMail(mailOptions);
    console.log('Verification email sent:', result.messageId);
    return result;
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw error;
  }
};

module.exports = {
  generateOTP,
  generateToken,
  sendVerificationEmail,
};