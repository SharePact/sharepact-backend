const jwt = require("jsonwebtoken");
const UserModel = require("../models/user");
const { NotAuthorizedError } = require("../errors/not-authorized-error");
const { verifyToken } = require("../utils/auth");

const checkAuth = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ error: "Unauthorized: No token provided" });
  }

  const resp = await getUserFromToken(token);
  if (resp.error)
    return res.status(resp.error.code).json({ error: resp.error.message });

  req.user = resp.user;
  next();
};

const getUserFromToken = async (token) => {
  /**
   * @type {jwt.SigningKeyCallback}
   */
  let decoded;

  try {
    decoded = await verifyToken(token);
  } catch (error) {
    const ntError = new NotAuthorizedError(error).serializeErrors();
    return { error: ntError, user: null };
  }

  try {
    const user = await UserModel.findById(decoded.userId);
    if (!user) {
      return {
        error: {
          message: "Unauthorized: User not found",
          code: 401,
          status: false,
        },
        user: null,
      };
    }

    return {
      error: null,
      user: user,
    };
  } catch (error) {
    return {
      error: {
        message: error.message,
        code: 500,
        status: false,
      },
      user: null,
    };
  }
};

module.exports = { checkAuth, getUserFromToken };
