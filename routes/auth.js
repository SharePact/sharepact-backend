const express = require('express');
const router = express.Router();
const auth = require('../controllers/auth');

// Sign-up with email and password
router.post('/signup', auth.signupWithEmail);

// Sign-in with email and password
router.post('/signin', auth.signinWithEmail);



module.exports = router;
