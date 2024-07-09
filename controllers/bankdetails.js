const BankDetails = require('../models/bankdetails');

// Add bank details
exports.addBankDetails = async (req, res) => {
  const { userId, accountName, bankName, accountNumber } = req.body;

  if (!userId || !accountName || !bankName || !accountNumber) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const existingBankDetails = await BankDetails.findOne({ userId });

    if (existingBankDetails) {
      return res.status(400).json({ error: 'Bank details already exist for this user.' });
    }

    const bankDetails = new BankDetails({
      userId,
      accountName,
      bankName,
      accountNumber,
    });

    await bankDetails.save();

    res.status(201).json({ message: 'Bank details added successfully', bankDetails });
  } catch (error) {
    console.error('Error adding bank details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get bank details for user
exports.getBankDetails = async (req, res) => {
  const { userId } = req.params;

  try {
    const bankDetails = await BankDetails.findOne({ userId });

    if (!bankDetails) {
      return res.status(404).json({ error: 'Bank details not found' });
    }

    res.status(200).json({ bankDetails });
  } catch (error) {
    console.error('Error fetching bank details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
