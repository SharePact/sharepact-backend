const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { uniqueNamesGenerator, adjectives, colors, animals } = require('unique-names-generator');

const generateRandomUsername = () => {
  return uniqueNamesGenerator({
    dictionaries: [adjectives, colors, animals],
    length: 2,
    style: 'capital',
  });
};

const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

const comparePassword = async (password, hashedPassword) => {
  return bcrypt.compare(password, hashedPassword);
};

const generateToken = (user) => {
  return jwt.sign({ uid: user._id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
};

module.exports = {
  generateRandomUsername,
  hashPassword,
  comparePassword,
  generateToken,
};
