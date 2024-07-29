const { Schema, model, Types } = require("mongoose");
const { generateRandomCode } = require("../utils/random");
const mongoose = require("mongoose");

// services: passwordReset, emailVerification, phoneVerification etc
const modelName = "OTP";
const authTokenDuration = 20; // 20 minutes
const authTokenExpiry = `${authTokenDuration}m`;

const OTPSchema = new Schema(
  {
    user: { type: mongoose.Types.ObjectId, required: true, ref: "User" },
    code: { type: String, required: true },
    service: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: authTokenExpiry },
    }, // TTL index
  },
  {
    indexes: [
      // Compound index to optimize queries by user, code, and service
      { fields: { user: 1, code: 1, service: 1 }, unique: true },
    ],
    statics: {
      async createNumberOTP(userId, service, length = 6) {
        const code = generateRandomCode(length);
        const expiresAt = new Date(Date.now() + authTokenDuration * 60 * 1000); // 20 minutes from now
        const otp = new this({ code, user: userId, service, expiresAt });
        await this.deleteOTPByUserService(userId, service);
        return await otp.save();
      },
      async deleteOTP(id) {
        return await this.findOneAndDelete({ _id: id });
      },
      async verifyOTP(userId, code, service) {
        const otp = await this.findOne({ user: userId, code, service });
        if (otp && otp.expiresAt > new Date()) {
          return true;
        }
        return false;
      },
      async deleteOTPUser(userId) {
        return this.deleteMany({ user: userId });
      },
      async deleteOTPByUserService(userId, service) {
        return this.deleteMany({ user: userId, service });
      },
      async getOTPByCode(userId, code, service) {
        return await this.findOne({ user: userId, code, service });
      },
    },
  }
);

const OTPModel = model(modelName, OTPSchema);

module.exports = OTPModel;
