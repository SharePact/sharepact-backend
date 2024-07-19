const BankDetails = require("../models/bankdetails");
const { BuildHttpResponse } = require("../utils/response");

exports.addBankDetails = async (req, res) => {
  try {
    const { accountName, bankName, accountNumber, sortCode } = req.body;
    const userId = req.user._id;
    const existingBankDetails = await BankDetails.getByUserId(userId);

    if (existingBankDetails) {
      return BuildHttpResponse(
        res,
        400,
        "Bank details already exist for this user"
      );
    }

    const bankDetails = await BankDetails.createBankDetails({
      user: userId,
      accountName,
      bankName,
      accountNumber,
      sortCode,
    });

    return BuildHttpResponse(
      res,
      201,
      "Bank details added successfully",
      bankDetails
    );
  } catch (error) {
    return BuildHttpResponse(res, 500, error.message);
  }
};

exports.getBankDetails = async (req, res) => {
  try {
    const { userId } = req.params;
    const bankDetails = await BankDetails.getByUserId(userId);

    if (!bankDetails) {
      return BuildHttpResponse(res, 404, "Bank details not found");
    }

    return BuildHttpResponse(
      res,
      200,
      "Bank details retrieved successfully",
      bankDetails
    );
  } catch (error) {
    return BuildHttpResponse(res, 500, error.message);
  }
};

exports.updateBankDetails = async (req, res) => {
  try {
    const { userId } = req.params;
    const { accountName, bankName, accountNumber, sortCode } = req.body;

    const bankDetails = await BankDetails.getByUserId(userId);

    if (!bankDetails) {
      return BuildHttpResponse(res, 404, "Bank details not found");
    }

    await bankDetails.updateBankDetails({
      accountName,
      bankName,
      accountNumber,
      sortCode,
    });

    return BuildHttpResponse(
      res,
      200,
      "Bank details updated successfully",
      bankDetails
    );
  } catch (error) {
    return BuildHttpResponse(res, 500, error.message);
  }
};

exports.deleteBankDetails = async (req, res) => {
  try {
    const { userId } = req.params;
    const bankDetails = await BankDetails.findOneAndDelete({ user: userId });

    if (!bankDetails) {
      return BuildHttpResponse(res, 404, "Bank details not found");
    }

    return BuildHttpResponse(res, 200, "Bank details deleted successfully");
  } catch (error) {
    return BuildHttpResponse(res, 500, error.message);
  }
};
