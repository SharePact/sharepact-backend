const express = require('express');
const { createGroup,getGroupsByService,getAllGroups } = require('../controllers/groupController');
const verifyToken = require('../middleware/auth');

const router = express.Router();

// Route for creating a group
router.post('/', verifyToken, createGroup);
router.get('/:serviceId', verifyToken, getGroupsByService);
router.get('/', verifyToken, getAllGroups);

module.exports = router;
