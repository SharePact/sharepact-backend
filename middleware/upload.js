const multer = require('multer');

// Configure multer storage settings
const storage = multer.memoryStorage();

// Create multer instance with storage settings
const upload = multer({ storage: storage });

// Middleware function to handle single file upload
const uploadServiceLogo = upload.single('logo'); // 'logo' is the name attribute from your form input

module.exports = { uploadServiceLogo };
