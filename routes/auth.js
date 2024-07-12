const express = require('express');
const router = express.Router();
const auth = require('../controllers/auth');
const { ZodMiddleware } = require('../middleware/zod.middleware');
const { createUserSchema } = require('../zodSchemas');

// Sign-up with email and password
router.post('/signup', ZodMiddleware(createUserSchema), auth.signupWithEmail);

// Sign-in with email and password
router.post('/signin', auth.signinWithEmail);



module.exports = router;
