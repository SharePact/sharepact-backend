const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { promisify } = require("util");
const {
  uniqueNamesGenerator,
  adjectives,
  colors,
  animals,
} = require("unique-names-generator");

// Generate a random username
const generateRandomUsername = () => {
  return uniqueNamesGenerator({
    dictionaries: [adjectives, colors, animals],
    length: 2,
    style: "capital",
  });
};

// Hash password
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

// Compare password
const comparePassword = async (password, hashedPassword) => {
  return bcrypt.compare(password, hashedPassword);
};

// Generate token
const generateToken = (user, expires = "1h") => {
  return jwt.sign(
    { userId: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: expires }
  );
};

// Verify token
const verifyToken = async (token) => {
  try {
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
    return decoded;
  } catch (error) {
    throw new Error("Invalid token");
  }
};

module.exports = {
  generateRandomUsername,
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
};
