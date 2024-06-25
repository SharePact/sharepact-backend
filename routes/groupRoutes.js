const express = require('express');
const { createGroup,getGroupsByService,getAllGroups, joinGroup, processJoinRequest} = require('../controllers/groupController');
const verifyToken = require('../middleware/auth');

const router = express.Router();

// Route for creating a group
router.post('/', verifyToken, createGroup);
router.get('/:serviceId', verifyToken, getGroupsByService);
router.get('/', verifyToken, getAllGroups);
// Route to join a group
router.post('/:groupId/join', verifyToken, joinGroup);

// Route to process join request by admin
router.patch('/:groupId/join-requests/:userId', verifyToken, processJoinRequest);

module.exports = router;
