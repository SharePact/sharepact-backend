const mongoose = require("mongoose");
const { getPaginatedResults } = require("../utils/pagination");
const modelName = "authToken";
const { generateToken, verifyToken } = require("../utils/auth");
const authTokenDuration = 1;
const authTokenExpiry = `${authTokenDuration}h`;

const AuthTokenSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    token: { type: String, required: true, index: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: authTokenExpiry },
    }, // TTL index
  },
  {
    methods: {},
    statics: {
      async createToken(user) {
        const token = this.generateToken(user, authTokenExpiry);
        const expiresAt = new Date(
          Date.now() + authTokenDuration * 60 * 60 * 1000
        );
        const authToken = new this({ user: user._id, token, expiresAt });
        await authToken.save();
        return authToken.token;
      },
      generateToken(user) {
        return generateToken(user, authTokenExpiry);
      },
      async findToken(token) {
        const authToken = this.findOne({ token: token });
        return authToken;
      },
      async verifyToken(token) {
        const authToken = await this.findToken(token);
        if (!authToken) {
          throw new Error("Invalid token");
        }
        return await verifyToken(authToken.token);
      },
      async deleteToken(token) {
        return this.deleteOne({ token });
      },
      async deleteAllTokensByUser(userId) {
        return this.deleteMany({ user: userId });
      },
    },
  }
);

module.exports = mongoose.model(modelName, AuthTokenSchema);
