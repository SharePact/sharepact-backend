const { Schema, model, Types } = require("mongoose");

const ChatRoomSchema = new Schema({
    group: { type: Types.ObjectId, required: true, ref: 'Group' },
    members: { type: [Types.ObjectId], ref: 'User', default: [] }
});

const ChatRoomModel = model('ChatRoom', ChatRoomSchema);

module.exports = ChatRoomModel;
