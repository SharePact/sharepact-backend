const express = require('express');
const profileController = require('../controllers/profile');
const checkAuth = require('../middleware/checkAuth');

const router = express.Router();

router.get('/avatars', checkAuth, profileController.getAllAvatars); // Add this line
router.put('/update-avatar', checkAuth, profileController.updateAvatar);
router.put('/update-username', checkAuth, profileController.updateUsername);
router.put('/change-password', checkAuth, profileController.changePassword); // Add this line

module.exports = router;
