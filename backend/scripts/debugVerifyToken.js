#!/usr/bin/env node
// Usage: node scripts/debugVerifyToken.js <token>
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { verifyToken } = require('../src/utils/tokenUtils');

async function main() {
  const token = process.argv[2];
  if (!token) {
    console.error(JSON.stringify({ ok: false, error: 'Missing token arg' }));
    process.exit(1);
  }
  try {
    const decoded = verifyToken(token);
    console.log(JSON.stringify({ ok: true, decoded }, null, 2));
    process.exit(0);
  } catch (e) {
    console.error(JSON.stringify({ ok: false, name: e.name, message: e.message }));
    process.exit(2);
  }
}

main();
