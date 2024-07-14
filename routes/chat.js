const express = require('express');
const ChatController= require('../controllers/chat');
const authenticateUser  = require('../middleware/checkAuth');

const router = express.Router();

router.post('/send-message', authenticateUser, ChatController.sendMessage);
router.get('/messages/:groupId', authenticateUser, ChatController.getMessages);

module.exports = router;
