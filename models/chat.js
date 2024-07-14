const { Schema, model, Types } = require("mongoose");

const ChatSchema = new Schema({
    group: { type: Types.ObjectId, required: true, ref: 'Group' },
    sender: { type: Types.ObjectId, required: true, ref: 'User' },
    message: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const ChatModel = model('Chat', ChatSchema);

module.exports = ChatModel;
