const mongoose = require("mongoose");
const { writeOnlyPlugin } = require("../utils/mongoose-plugins");
const { hashPassword } = require("../utils/auth");
const modelName = "User";
const Schema = mongoose.Schema;
const NotificationModel = require("./Notifications");
const GroupModel = require("./group");
const AuthTokenModel = require("./authToken");
const BankDetailsModel = require("./bankdetails");

const NotificationConfigSchema = new Schema({
  loginAlert: { type: Boolean, default: true },
  passwordChanges: { type: Boolean, default: true },
  newGroupCreation: { type: Boolean, default: false },
  groupInvitation: { type: Boolean, default: true },
  groupMessages: { type: Boolean, default: true },
  subscriptionUpdates: { type: Boolean, default: false },
  paymentReminders: { type: Boolean, default: true },
  renewalAlerts: { type: Boolean, default: true },
});

const defaultNotificationConfig = {
  loginAlert: true,
  passwordChanges: true,
  newGroupCreation: false,
  groupInvitation: true,
  groupMessages: true,
  subscriptionUpdates: false,
  paymentReminders: true,
  renewalAlerts: true,
};
const UserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true },
    username: { type: String, required: true, unique: true, trim: true },
    avatarUrl: { type: String, required: true },
    verified: { type: Boolean, default: false },
    role: { type: String, default: "user" },
    deviceToken: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    notificationConfig: {
      type: NotificationConfigSchema,
      default: defaultNotificationConfig,
    },
    deleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
  },
  {
    indexes: [{ fields: { email: 1 } }, { fields: { username: 1 } }],
    methods: {
      async deleteUserAndAssociatedData() {
        const userId = this._id;
        await NotificationModel.deleteMany({ user: userId });
        await AuthTokenModel.deleteMany({ user: userId });
        await BankDetailsModel.deleteMany({ user: userId });
        await GroupModel.removeUserFromAllGroups(userId);
        await this.deleteOne(); // Or this.remove() in older versions of mongoose
        return true;
      },
      async updatePassword(newPassword) {
        const hashedNewPassword = await hashPassword(newPassword);
        this.password = hashedNewPassword;
        await this.save();
        return this;
      },
      async updateUsernameAndEmail({ username = null, email = null }) {
        if (username) this.username = username;
        if (email) this.email = email;
        await this.save();
        return this;
      },
      async verifyUser() {
        this.verified = true;
        await this.save();
        return this;
      },
      async deleteAccount() {
        this.deleted = true;
        this.deletedAt = new Date();
        await this.save();
        return this;
      },
      async updateDeviceToken(token = "") {
        this.deviceToken = token;
        await this.save();
        return this;
      },
      async updateNotificationConfig({
        loginAlert = null,
        passwordChanges = null,
        newGroupCreation = null,
        groupInvitation = null,
        groupMessages = null,
        subscriptionUpdates = null,
        paymentReminders = null,
        renewalAlerts = null,
      }) {
        if (!this.notificationConfig) this.notificationConfig = {};
        this.notificationConfig.loginAlert =
          loginAlert ?? this.notificationConfig.loginAlert;
        this.notificationConfig.passwordChanges =
          passwordChanges ?? this.notificationConfig.passwordChanges;
        this.notificationConfig.newGroupCreation =
          newGroupCreation ?? this.notificationConfig.newGroupCreation;
        this.notificationConfig.groupInvitation =
          groupInvitation ?? this.notificationConfig.groupInvitation;
        this.notificationConfig.groupMessages =
          groupMessages ?? this.notificationConfig.groupMessages;
        this.notificationConfig.subscriptionUpdates =
          subscriptionUpdates ?? this.notificationConfig.subscriptionUpdates;
        this.notificationConfig.paymentReminders =
          paymentReminders ?? this.notificationConfig.paymentReminders;
        this.notificationConfig.renewalAlerts =
          renewalAlerts ?? this.notificationConfig.renewalAlerts;
        await this.save();
        return this;
      },
    },
    statics: {
      findByEmail(email) {
        return this.findOne({ email: email.toString() });
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
        const hashedPassword = await hashPassword(password); // Hash the password
        const newUser = new model({
          email,
          password: hashedPassword, // Store hashed password
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
