const express = require('express');
const multer = require('multer');
const verifyToken = require('../middleware/auth');
const verifyAdmin = require('../middleware/admin');

const { createCategory, getCategories, getCategoryById, updateCategory, deleteCategory } = require('../controllers/categoryController');

const router = express.Router();
const upload = multer(); // Multer middleware to handle file uploads

// Create a new category
router.post('/', verifyToken, verifyAdmin,upload.single('image'), createCategory);

// Get all categories
router.get('/', verifyToken, getCategories);

// Get a specific category by ID
router.get('/:id', verifyToken, getCategoryById);

// Update an existing category
router.put('/:id', verifyToken, verifyAdmin,upload.single('image'), updateCategory);

// Delete a category
router.delete('/:id', verifyToken, verifyAdmin,deleteCategory);

module.exports = router;
