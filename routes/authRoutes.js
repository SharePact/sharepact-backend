const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Sign-up with email and password
router.post('/signup', authController.signupWithEmail);

// Sign-in with email and password
router.post('/signin', authController.signinWithEmail);

// Sign-in with Google
router.post('/google', authController.signinWithGoogle);

// Sign-in with Apple
router.post('/apple', authController.signinWithApple);

module.exports = router;
