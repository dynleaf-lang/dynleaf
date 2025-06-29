const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const dotenv = require('dotenv');
const RefreshToken = require('../models/RefreshToken');

dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-for-dev-only';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || JWT_SECRET + '-refresh';
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '24h';
const JWT_REFRESH_EXPIRATION = process.env.JWT_REFRESH_EXPIRATION || '7d';
const JWT_ISSUER = process.env.JWT_ISSUER || 'your-issuer';
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'your-audience';

/**
 * Generate an access token
 * @param {Object} payload - User data to include in token
 * @returns {String} Access token
 */
const generateAccessToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRATION,
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE
  });
};

/**
 * Generate a refresh token and store it in the database
 * @param {Object} userData - User data to include in token
 * @param {String} deviceInfo - Information about the user's device
 * @returns {String} Refresh token
 */
const generateRefreshToken = async (userData, deviceInfo = 'Unknown device') => {
  const { id, role, isGuest = false } = userData;
  
  // Generate a random token
  const refreshToken = crypto.randomBytes(40).toString('hex');
  
  // Calculate expiry date
  const expiresIn = JWT_REFRESH_EXPIRATION === '7d' ? 7 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
  const expiresAt = new Date(Date.now() + expiresIn);
  
  // Store token in database
  await RefreshToken.create({
    token: refreshToken,
    userId: id,
    userRole: role,
    deviceInfo,
    isGuest,
    expiresAt
  });
  
  return refreshToken;
};

/**
 * Verify a refresh token and return user data
 * @param {String} refreshToken - The refresh token to verify
 * @returns {Object} User data
 */
const verifyRefreshToken = async (refreshToken) => {
  const tokenDoc = await RefreshToken.findOne({ token: refreshToken, expiresAt: { $gt: new Date() } });
  
  if (!tokenDoc) {
    throw new Error('Invalid or expired refresh token');
  }
  
  return {
    id: tokenDoc.userId,
    role: tokenDoc.userRole,
    isGuest: tokenDoc.isGuest
  };
};

/**
 * Revoke a refresh token
 * @param {String} refreshToken - The refresh token to revoke
 */
const revokeRefreshToken = async (refreshToken) => {
  await RefreshToken.deleteOne({ token: refreshToken });
};

/**
 * Revoke all refresh tokens for a user
 * @param {String} userId - The user ID
 */
const revokeAllUserTokens = async (userId) => {
  await RefreshToken.deleteMany({ userId });
};

/**
 * Clean up expired tokens (can be run periodically)
 */
const cleanupExpiredTokens = async () => {
  const result = await RefreshToken.deleteMany({ expiresAt: { $lt: new Date() } });
  return result.deletedCount || 0;
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
  cleanupExpiredTokens,
  JWT_EXPIRATION,
  JWT_REFRESH_EXPIRATION
};