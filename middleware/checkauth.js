const jwt = require('jsonwebtoken');

const checkAuth = (req, res, next) => {
  // Get token from Authorization header
  const token = req.headers.authorization?.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  // Verify JWT token
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      console.error('JWT verification error:', err);
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
    // Attach decoded user information to request object
    req.user = decoded;
    next(); // Call next middleware or route handler
  });
};

module.exports = checkAuth;
