const express = require('express');
const { createGroup,getGroupsByService,getAllGroups, requestToJoinGroup,
    processJoinRequest, toggleMemberReady } = require('../controllers/groupController');
const verifyToken = require('../middleware/auth');
const { ZodMiddleware } = require('../middleware/zod.middleware');
const { createGroupSchema, processJoinRequestSchema } = require('../zodSchemas');
const checkAuth = require('../middleware/checkAuth');

const router = express.Router();

// Route for creating a group
router.post('/', checkAuth, ZodMiddleware(createGroupSchema), createGroup);
router.get('/:serviceId', checkAuth, getGroupsByService);
router.get('/', checkAuth, getAllGroups);
// Route to join a group

router.post('/join', checkAuth, requestToJoinGroup);

// Route to process join request by admin
router.post('/join-requests/:requestId', checkAuth, 
    ZodMiddleware(processJoinRequestSchema), processJoinRequest);


router.get("/:groupId/messages")

router.post("/:groupId/members/ready", checkAuth, toggleMemberReady);

module.exports = router;
