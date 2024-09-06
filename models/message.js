const mongoose = require("mongoose");
const { Schema } = mongoose;
const { getPaginatedResults } = require("../utils/pagination");
const { boolean } = require("zod");
const modelName = "Message";
const MessageSchema = new Schema(
  {
    content: { type: String, required: true },
    sender: {
      type: mongoose.Types.ObjectId,
      required: true,
      ref: "User",
      index: true,
    },
    group: {
      type: mongoose.Types.ObjectId,
      required: true,
      ref: "Group",
      index: true,
    },
    replyTo: { type: mongoose.Types.ObjectId, ref: modelName, index: true },
    readBy: [{ type: mongoose.Types.ObjectId, ref: "User", index: true }],
    sentAt: { type: Date, default: Date.now, index: true },
  },
  {
    methods: {
      async isReply() {
        return !!this.replyTo;
      },
      async getReplyChain() {
        const chain = [];
        let currentMessage = this;
        while (currentMessage.replyTo) {
          const replyMessage = await this.model(modelName)
            .findById(currentMessage.replyTo)
            .exec();
          if (replyMessage) {
            chain.push(replyMessage);
            currentMessage = replyMessage;
          } else {
            break;
          }
        }
        return chain;
      },
    },
    statics: {
      async getMessagesByGroup(groupId, limit = 10, cursor = null) {
        const model = mongoose.model(modelName);
        const query = { group: groupId };

        if (cursor) {
          query._id = { $lt: cursor }; // Assuming messages are sorted by _id in descending order
        }

        const messages = await model
          .find(query)
          .sort({ _id: -1 }) // Sorting by _id in descending order for cursor-based pagination
          .limit(limit)
          .populate("sender", "username email avatarUrl")
          .exec();

        return {
          messages,
          nextCursor:
            messages.length > 0 ? messages[messages.length - 1]._id : null,
        };
      },
      async createMessage({ content, sender, group, replyTo = null }) {
        const model = mongoose.model(modelName);
        const newMessage = new model({
          content,
          sender,
          group,
          replyTo,
        });
        await newMessage.save();
        return newMessage;
      },
       // Add the missing getLatestMessageByGroup method
  async getLatestMessageByGroup(groupId) {
    const model = mongoose.model(modelName);
    
    // Find the latest message in the group sorted by sentAt or _id
    return model
      .findOne({ group: groupId })
      .sort({ sentAt: -1 }) // Sorting by sentAt or createdAt (if using that instead)
      .populate("sender", "username email")
      .exec();
  },

      async getUnreadMessagesCount(userId) {
        const model = mongoose.model(modelName);
        const count = await model
          .countDocuments({
            readBy: { $ne: userId },
          })
          .exec();
        return count;
      },
      async getUnreadMessagesCountByGroup(userId, groupId) {
        const model = mongoose.model(modelName);
        const count = await model
          .countDocuments({
            group: groupId,
            readBy: { $ne: userId },
          })
          .exec();
        return count;
      },
      async markMessagesAsReadByIds(userId, ids) {
        const model = mongoose.model(modelName);
        await model
          .updateMany(
            { _id: { $in: ids }, readBy: { $ne: userId } },
            { $addToSet: { readBy: userId } }
          )
          .exec();
        return;
      },
      async markAllMessagesAsReadByGroup(userId, groupId) {
        const model = mongoose.model(modelName);
        await model
          .updateMany(
            { group: groupId, readBy: { $ne: userId } },
            { $addToSet: { readBy: userId } }
          )
          .exec();
        return;
      },
    },
  }
);

const Message = mongoose.model(modelName, MessageSchema);

module.exports = Message;
