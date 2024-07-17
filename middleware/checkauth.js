const jwt = require("jsonwebtoken");
const UserModel = require("../models/user");
const { NotAuthorizedError } = require("../errors/not-authorized-error");
const { verifyToken } = require("../utils/auth");

const checkAuth = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ error: "Unauthorized: No token provided" });
  }

  /**
   * @type {jwt.SigningKeyCallback}
   */
  let decoded;

  try {
    decoded = await verifyToken(token);
  } catch (error) {
    const ntError = new NotAuthorizedError(error).serializeErrors();
    return res.status(ntError.code).json({ ...ntError });
  }

  try {
    const user = await UserModel.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized: User not found" });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = checkAuth;
