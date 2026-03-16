const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'family-rpg-secret-change-me';
const SALT_ROUNDS = 10;

function hashPassword(plain) {
  return bcrypt.hashSync(plain, SALT_ROUNDS);
}

function checkPassword(plain, hashed) {
  return bcrypt.compareSync(plain, hashed);
}

function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

// Express middleware: requires valid JWT in Authorization header
function requireAuth(req, res, next) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// Requires role to be admin or gamemaster
function requireGM(req, res, next) {
  if (req.user.role === 'admin' || req.user.role === 'gamemaster') return next();
  res.status(403).json({ error: 'Insufficient privileges' });
}

function requireAdmin(req, res, next) {
  if (req.user.role === 'admin') return next();
  res.status(403).json({ error: 'Admin only' });
}

module.exports = { hashPassword, checkPassword, signToken, verifyToken, requireAuth, requireGM, requireAdmin };
