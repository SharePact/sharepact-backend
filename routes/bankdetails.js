const express = require('express');
const bankDetailsController = require('../controllers/bankdetails');
const checkAuth = require('../middleware/checkAuth');

const router = express.Router();

router.post('/add-bank-details', checkAuth, bankDetailsController.addBankDetails);
router.get('/bank-details/:userId', checkAuth, bankDetailsController.getBankDetails);

module.exports = router;
