const express = require('express');
const GroupController = require('../controllers/group');
const authenticateUser = require('../middleware/checkAuth');

const router = express.Router();

router.post('/create', authenticateUser, GroupController.createGroup);
router.post('/join', authenticateUser, GroupController.requestToJoinGroup);
router.post('/handle-join-request', authenticateUser, GroupController.handleJoinRequest);
router.get('/join-requests/:groupId', authenticateUser, GroupController.getJoinRequests);
router.get('/:groupId', authenticateUser, GroupController.getGroupDetails);
router.post('/activate/:groupId', authenticateUser, GroupController.activateGroup);

module.exports = router;
