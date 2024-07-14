const ChatModel = require('../models/chat');
const ChatRoomModel = require('../models/chatroom');

exports.sendMessage = async (req, res) => {
    try {
        const { groupId, message } = req.body;
        const sender = req.user._id;

        const chatRoom = await ChatRoomModel.findOne({ group: groupId });
        if (!chatRoom.members.includes(sender)) {
            return res.status(403).json({ error: 'You are not a member of this group chat' });
        }

        const newMessage = new ChatModel({ group: groupId, sender, message });
        await newMessage.save();

        res.status(201).json(newMessage);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getMessages = async (req, res) => {
    try {
        const { groupId } = req.params;

        const chatRoom = await ChatRoomModel.findOne({ group: groupId });
        if (!chatRoom.members.includes(req.user._id)) {
            return res.status(403).json({ error: 'You are not a member of this group chat' });
        }

        const messages = await ChatModel.find({ group: groupId }).populate('sender', 'name').sort({ createdAt: -1 });

        res.status(200).json(messages);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

