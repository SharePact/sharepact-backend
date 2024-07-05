const express = require('express');
const { createGroup,getGroupsByService,getAllGroups, requestToJoinGroup, processJoinRequest} = require('../controllers/groupController');
const verifyToken = require('../middleware/auth');
const { ZodMiddleware } = require('../middleware/zod.middleware');
const { createGroupSchema, processJoinRequestSchema } = require('../zodSchemas');

const router = express.Router();

// Route for creating a group
router.post('/', verifyToken, ZodMiddleware(createGroupSchema), createGroup);
router.get('/:serviceId', verifyToken, getGroupsByService);
router.get('/', verifyToken, getAllGroups);
// Route to join a group

router.post('/:groupId/join', verifyToken, requestToJoinGroup);

// Route to process join request by admin
router.post('/join-requests/:requestId', verifyToken, 
    ZodMiddleware(processJoinRequestSchema), processJoinRequest);

module.exports = router;
