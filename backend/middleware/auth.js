const jwt = require('jsonwebtoken');

// Reads the token from the Authorization header (normal case) or from a
// ?token= query param (used only for <Image>/<a> style GET requests to the
// receipt-file route, where React Native's Image component can't easily
// attach custom headers).
function extractToken(req) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) return header.split(' ')[1];
  if (req.query && req.query.token) return req.query.token;
  return null;
}

module.exports = function authMiddleware(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    req.userRole = decoded.role || 'engineer';
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};
