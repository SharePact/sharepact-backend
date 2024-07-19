const mongoose = require("mongoose");
const { writeOnlyPlugin } = require("../utils/mongoose-plugins");
const { hashPassword } = require("../utils/auth");
const modelName = "User";

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true, unique: true },
    username: { type: String, required: true },
    avatarUrl: { type: String, required: true },
    verified: { type: Boolean, default: false },
    role: { type: String, default: "user" },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    methods: {
      async updatePassword(newPassword) {
        const hashedNewPassword = await hashPassword(newPassword);
        this.password = hashedNewPassword;
        await this.save();
        return this;
      },
    },
    statics: {
      findByEmail(email) {
        return this.findOne({ email });
      },
      findByUsername(username) {
        return this.findOne({ username });
      },
      async createUser({
        email,
        password,
        username,
        avatarUrl,
        verified,
        role = "user",
      }) {
        const model = mongoose.model(modelName);
        const newUser = new model({
          email,
          password, // Store hashed password
          username,
          avatarUrl, // Assign avatar URL
          verified, // Optional: default value for email verification
          role, // Optional: default user role
        });

        await newUser.save();
        return newUser.toJSON();
      },
    },
  }
);

UserSchema.plugin(writeOnlyPlugin, { writeOnlyFields: ["password"] });
const User = mongoose.model(modelName, UserSchema);
module.exports = User;
