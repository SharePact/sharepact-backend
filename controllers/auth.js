const UserModel = require("../models/user");
const {
  generateRandomUsername,
  hashPassword,
  comparePassword,
  generateToken,
} = require("../utils/auth");

// Predefined avatar URLs (example)
const avatarUrls = [
  "https://res.cloudinary.com/your-cloud-name/image/upload/v123456/avatar1.png",
  "https://res.cloudinary.com/your-cloud-name/image/upload/v123456/avatar2.png",
  "https://res.cloudinary.com/your-cloud-name/image/upload/v123456/avatar3.png",
  "https://res.cloudinary.com/your-cloud-name/image/upload/v123456/avatar4.png",
  "https://res.cloudinary.com/your-cloud-name/image/upload/v123456/avatar5.png",
  "https://res.cloudinary.com/your-cloud-name/image/upload/v123456/avatar6.png",
  "https://res.cloudinary.com/your-cloud-name/image/upload/v123456/avatar7.png",
  "https://res.cloudinary.com/your-cloud-name/image/upload/v123456/avatar8.png",
  "https://res.cloudinary.com/your-cloud-name/image/upload/v123456/avatar9.png",
  // Add more URLs as needed
];

// Sign-up with email and password
exports.signupWithEmail = async (req, res) => {
  const { email, password } = req.body;
  const randomUsername = generateRandomUsername();

  try {
    const existingUser = await UserModel.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        error: "Email already exists. Please use a different email address.",
      });
    }

    const hashedPassword = await hashPassword(password); // Hash the password

    // Assign a random avatar URL
    const avatarUrl = avatarUrls[Math.floor(Math.random() * avatarUrls.length)];

    const newUser = await UserModel.createUser({
      email,
      password: hashedPassword, // Store hashed password
      username: randomUsername,
      avatarUrl, // Assign avatar URL
      verified: false, // Optional: default value for email verification
      role: "user", // Optional: default user role
    });

    res.status(201).json({
      message: "User signed up successfully",
      user: newUser,
    });
  } catch (error) {
    console.error("Error during sign up:", error);
    res
      .status(500)
      .json({ error: "An error occurred during sign up. Please try again." });
  }
};

// Sign-in with email and password
exports.signinWithEmail = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await UserModel.findByEmail(email);
    if (!user) {
      return res.status(400).json({ error: "No user found with this email." });
    }

    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ error: "Incorrect password." });
    }

    // Generate token
    const token = generateToken(user);

    // Remove sensitive fields from user object before sending in response
    const userWithoutSensitiveInfo = user.toJSON();

    res.status(200).json({
      message: "User signed in successfully",
      user: userWithoutSensitiveInfo,
      token: token,
    });
  } catch (error) {
    console.error("Error during sign in:", error);
    res.status500.json({
      error: "An error occurred during sign in. Please try again.",
    });
  }
};
