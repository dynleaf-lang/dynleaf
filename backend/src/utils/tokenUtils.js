const jwt = require('jsonwebtoken');

const MAGIC_JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-for-dev-only';
const MAGIC_JWT_ISSUER = process.env.JWT_ISSUER || 'your-issuer';
const MAGIC_JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'your-audience';

function createMagicToken(payload = {}, expiresIn = '60m') {
  const base = { type: 'wa-magic', ...payload };
  return jwt.sign(base, MAGIC_JWT_SECRET, {
    expiresIn,
    issuer: MAGIC_JWT_ISSUER,
    audience: MAGIC_JWT_AUDIENCE,
  });
}

function verifyToken(token) {
  return jwt.verify(token, MAGIC_JWT_SECRET, {
    issuer: MAGIC_JWT_ISSUER,
    audience: MAGIC_JWT_AUDIENCE,
  });
}

module.exports = { createMagicToken, verifyToken };