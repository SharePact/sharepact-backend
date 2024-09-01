const BankDetails = require("../models/bankdetails");
const axios = require('axios'); 
const PaymentModel = require("../models/payment");
const { BuildHttpResponse } = require("../utils/response");
const GroupModel = require("../models/group");
const Flutterwave = require("../utils/flutterwave");

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

exports.verifyPayment = async (req, res) => {
  try {
    // let { trxref, reference } = req.query;
    let { tx_ref, transaction_id } = req.query;

    const payment = await PaymentModel.getPaymentByReference(tx_ref);
    if (!payment)
      return res
        .status(400)
        .send(
          '<p style="color: red; font-weight: bold; text-align: center; font-size: 20px;">Invalid payment info</p>'
        );

    if (payment?.status == "successful")
      return res
        .status(400)
        .send(
          '<p style="color: red; font-weight: bold; text-align: center; font-size: 20px;">Payment details have already been used</p>'
        );

    const group = await GroupModel.findById(payment.group);
    if (!group)
      return res
        .status(400)
        .send(
          '<p style="color: red; font-weight: bold; text-align: center; font-size: 20px;">group not found</p>'
        );

    const member = await group.findMemberById(payment.user);
    if (!member)
      return res
        .status(400)
        .send(
          '<p style="color: red; font-weight: bold; text-align: center; font-size: 20px;">you are not a member of the group</p>'
        );

    const pResponse = await Flutterwave.verify(transaction_id);
    if (pResponse.status) {
      await group.updateMemberSubscriptionStatus(payment.user, "active");
      await group.updateMemberPaymentActiveState(user._id, true);
      await payment.updateStatus("successful");
    } else {
      await payment.updateStatus("failed");
    }

    if (!pResponse.status)
      return res
        .status(400)
        .send(
          '<p style="color: red; font-weight: bold; text-align: center; font-size: 20px;">payment failed</p>'
        );

    return res
      .status(200)
      .send(
        '<p style="color: green; font-weight: bold; text-align: center; font-size: 20px;">Payment successful</p>'
      );
  } catch (error) {
    return BuildHttpResponse(res, 500, error.message);
  }
};


exports.getBanks = async (req, res) => {
  try {
    const response = await axios.get('https://api.flutterwave.com/v3/banks/NG', {
      headers: {
        'Authorization': `Bearer ${process.env.FLUTTERWAVE_SEC_KEY}`,
      },
    });

    if (response.status === 200) {
      return BuildHttpResponse(res, 200, "Banks retrieved successfully", response.data.data);
    } else {
      return BuildHttpResponse(res, response.status, response.statusText);
    }
  } catch (error) {
    return BuildHttpResponse(res, 500, error.message);
  }
};
