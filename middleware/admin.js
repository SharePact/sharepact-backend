const admin = require('firebase-admin');

const verifyAdmin = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    console.error('No token provided');
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    if (decodedToken.role !== 'admin') {
      console.error('Not an admin');
      return res.status(403).json({ error: 'Forbidden: Admins only' });
    }
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Error verifying token for admin:', error);
    return res.status(403).json({ error: 'Unauthorized: Invalid token' });
  }
};

module.exports = verifyAdmin;
