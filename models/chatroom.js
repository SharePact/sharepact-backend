const { Schema, model, Types } = require("mongoose");
const mongoose = require("mongoose");
const modelName = "ChatRoom";
const ChatRoomSchema = new Schema(
  {
    group: { type: Types.ObjectId, required: true, ref: "Group" },
    members: { type: [Types.ObjectId], ref: "User", default: [] },
  },
  {
    methods: {
      async addMember(userId) {
        this.members.push(userId);
        await this.save();
        return this;
      },
    },
    statics: {
      async createChatRoom({ groupId, members }) {
        const model = mongoose.model(modelName);
        const newChatRoom = new model({
          group: groupId,
          members,
        });

        await newChatRoom.save();
        return newChatRoom;
      },
      findByGroupId(groupId) {
        return this.findOne({ group: groupId });
      },
    },
  }
);

const ChatRoomModel = model(modelName, ChatRoomSchema);

module.exports = ChatRoomModel;
