const express = require('express');
const { createGroup } = require('../controllers/groupController');
const verifyToken = require('../middleware/auth');

const router = express.Router();

// Route for creating a group
router.post('/', verifyToken, createGroup);

module.exports = router;
