const UserModel = require('../models/user'); 
const { generateRandomUsername, hashPassword, comparePassword, generateToken } = require('../utils/auth');


// Sign-up with email and password
exports.signupWithEmail = async (req, res) => {
    const { email, password } = req.body;
    const randomUsername = generateRandomUsername();

    try {
        const hashedPassword = await hashPassword(password); // Hash the password

        const newUser = new UserModel({
            email,
            password: hashedPassword, // Store hashed password
            username: randomUsername,
        });

        await newUser.save();

        // Remove password from user object before sending in response
        const userWithoutPassword = { ...newUser.toObject() };
        delete userWithoutPassword.password;

        res.status(201).json({ message: 'User signed up successfully', user: userWithoutPassword });
    } catch (error) {
        if (error.code === 11000 && error.keyPattern && error.keyPattern.email) {
            return res.status(400).json({ error: 'Email already exists. Please use a different email address.' });
        }
        res.status(400).json({ error: error.message });
    }
};



// Sign-in with email and password
exports.signinWithEmail = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await UserModel.findOne({ email });
        if (!user) {
            return res.status(400).json({ error: 'No user found with this email.' });
        }

        const isPasswordValid = await comparePassword(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ error: 'Incorrect password.' });
        }

        // Generate token
        const token = generateToken(user);

        // Remove sensitive fields from user object before sending in response
        const userWithoutSensitiveInfo = { ...user.toObject() };
        delete userWithoutSensitiveInfo.password;

        res.status(200).json({
            message: 'User signed in successfully',
            user: userWithoutSensitiveInfo,
            token: token
        });
    } catch (error) {
        console.error('Error during sign in:', error);
        res.status(400).json({ error: 'An error occurred during sign in. Please try again.' });
    }
};
