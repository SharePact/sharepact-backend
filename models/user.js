const mongoose = require("mongoose");
const { writeOnlyPlugin } = require("../utils/mongoose-plugins");
const modelName = "User";

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  username: { type: String, required: true },
  avatarUrl: { type: String, required: true },
  verified: { type: Boolean, default: false },
  role: { type: String, default: "user" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

UserSchema.plugin(writeOnlyPlugin, { writeOnlyFields: ["password"] });

UserSchema.statics.findByEmail = function (email) {
  return this.findOne({ email });
};

UserSchema.statics.createUser = async function ({
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
};

const User = mongoose.model(modelName, UserSchema);

module.exports = User;
