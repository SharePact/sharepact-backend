const mongoose = require("mongoose");
const { Schema } = mongoose;
const { getPaginatedResults } = require("../utils/pagination");
const modelName = "Notification";
const NotificationSchema = new Schema(
  {
    subject: { type: String },
    textContent: { type: String, required: true },
    htmlContent: { type: String, required: true },
    user: {
      type: mongoose.Types.ObjectId,
      required: true,
      ref: "User",
      index: true,
    },
    read: { type: Boolean, default: false, index: true },
    createdAt: { type: Date, default: Date.now },
  },
  {
    methods: {},
    statics: {
      async createNotification({ subject, textContent, htmlContent, userId }) {
        const notification = new this({
          subject,
          textContent,
          htmlContent,
          user: userId,
        });
        return notification.save();
      },

      async markAsRead(notificationIds, userId) {
        const result = await this.updateMany(
          { _id: { $in: notificationIds }, user: userId },
          { read: true },
          { new: true }
        );
        return result;
      },

      async markAllAsRead(userId) {
        const result = await this.updateMany(
          { user: userId, read: false },
          { read: true },
          { new: true }
        );
        return result;
      },

      async getUnreadCount(userId) {
        const count = await this.countDocuments({ user: userId, read: false });
        return count;
      },

      async getNotifications(userId, page = 1, limit = 10) {
        const query = { user: userId };
        return getPaginatedResults(
          this,
          page,
          limit,
          query,
          {},
          { sort: { _id: -1 } }
        );
      },
    },
  }
);

const NotificationModel = mongoose.model(modelName, NotificationSchema);

module.exports = NotificationModel;
