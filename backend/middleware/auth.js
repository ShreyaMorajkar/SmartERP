const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  let token = null;

  // 1. Check Authorization Header
  const authHeader = req.headers['authorization'];
  if (authHeader) {
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else {
      token = authHeader;
    }
  }

  // 2. Check query parameter (for direct file downloads via window.open)
  if (!token && req.query && req.query.token) {
    token = req.query.token;
  }

  // 3. Check custom header
  if (!token && req.headers['x-auth-token']) {
    token = req.headers['x-auth-token'];
  }

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'smarterp_jwt_secret_key_12345!');
    req.user = decoded;
    next();
  } catch (ex) {
    res.status(400).json({ error: 'Invalid token.' });
  }
};
