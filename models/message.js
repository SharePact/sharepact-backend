const mongoose = require("mongoose");
const { Schema } = mongoose;
const { getPaginatedResults } = require("../utils/pagination");
const modelName = "Message";
const MessageSchema = new Schema(
  {
    content: { type: String, required: true },
    sender: { type: mongoose.Types.ObjectId, required: true, ref: "User" },
    group: { type: mongoose.Types.ObjectId, required: true, ref: "Group" },
    replyTo: { type: mongoose.Types.ObjectId, ref: modelName },
    sentAt: { type: Date, default: Date.now },
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
          .populate("sender", "username email")
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
    },
  }
);

const Message = mongoose.model(modelName, MessageSchema);

module.exports = Message;
