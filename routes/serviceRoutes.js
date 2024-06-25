const express = require('express');
const { createService, getServices,  getServiceById, updateService, deleteService } = require('../controllers/serviceController');
const { uploadServiceLogo } = require('../middleware/upload');
const verifyToken = require('../middleware/auth');
const verifyAdmin = require('../middleware/admin');

const router = express.Router();

// Routes for services
router.post('/create', verifyToken, verifyAdmin, uploadServiceLogo, createService); // Only admins can create
router.get('/', getServices); // Everyone can read
router.get('/:id',  getServiceById); // Everyone can read
router.put('/:id', verifyToken, verifyAdmin, uploadServiceLogo, updateService); // Only admins can update
router.delete('/:id', verifyToken, verifyAdmin, deleteService); // Only admins can delete

module.exports = router;
