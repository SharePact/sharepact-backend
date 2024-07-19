const BankDetails = require('../models/bankdetails');
const { BuildHttpResponse } = require('../utils/response');

exports.addBankDetails = async (req, res) => {
  try {
    const { userId, accountName, bankName, accountNumber } = req.body;

    if (!userId || !accountName || !bankName || !accountNumber) {
      return BuildHttpResponse(res, 400, "Missing required fields");
    }

    const existingBankDetails = await BankDetails.findOne({ user: userId });

    if (existingBankDetails) {
      return BuildHttpResponse(res, 400, "Bank details already exist for this user");
    }

    const bankDetails = await BankDetails.createBankDetails({
      user: userId,
      accountName,
      bankName,
      accountNumber,
    });

    return BuildHttpResponse(res, 201, "Bank details added successfully", bankDetails);
  } catch (error) {
    console.error('Error adding bank details:', error);
    return BuildHttpResponse(res, 500, "Internal server error");
  }
};

exports.getBankDetails = async (req, res) => {
  try {
    const { userId } = req.params;
    const bankDetails = await BankDetails.getBankDetailsByUser(userId);

    if (!bankDetails) {
      return BuildHttpResponse(res, 404, "Bank details not found");
    }

    return BuildHttpResponse(res, 200, "Bank details retrieved successfully", bankDetails);
  } catch (error) {
    console.error('Error fetching bank details:', error);
    return BuildHttpResponse(res, 500, "Internal server error");
  }
};

// exports.updateBankDetails = async (req, res) => {
//   try {
//     const { userId } = req.params;
//     const { accountName, bankName, accountNumber } = req.body;

//     const bankDetails = await BankDetails.findOne({ user: userId });

//     if (!bankDetails) {
//       return BuildHttpResponse(res, 404, "Bank details not found");
//     }

//     await bankDetails.updateBankDetails({ accountName, bankName, accountNumber });

//     return BuildHttpResponse(res, 200, "Bank details updated successfully", bankDetails);
//   } catch (error) {
//     console.error('Error updating bank details:', error);
//     return BuildHttpResponse(res, 500, "Internal server error");
//   }
// };

// exports.deleteBankDetails = async (req, res) => {
//   try {
//     const { userId } = req.params;
//     const bankDetails = await BankDetails.findOneAndDelete({ user: userId });

//     if (!bankDetails) {
//       return BuildHttpResponse(res, 404, "Bank details not found");
//     }

//     return BuildHttpResponse(res, 200, "Bank details deleted successfully");
//   } catch (error) {
//     console.error('Error deleting bank details:', error);
//     return BuildHttpResponse(res, 500, "Internal server error");
//   }
// };