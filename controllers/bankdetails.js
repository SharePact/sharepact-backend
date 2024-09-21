const BankDetails = require("../models/bankdetails");
const axios = require("axios");
const PaymentModel = require("../models/payment");
const { BuildHttpResponse } = require("../utils/response");
const GroupModel = require("../models/group");
const Flutterwave = require("../utils/flutterwave");
const mongoose = require("mongoose");

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
    let { tx_ref, transaction_id } = req.query;

    // Retrieve payment info using the reference
    const payment = await PaymentModel.getPaymentByReference(tx_ref);
    if (!payment)
      return res
        .status(400)
        .send(
          '<p style="color: red; font-weight: bold; text-align: center; font-size: 20px;">Invalid payment info</p>'
        );

    // Check if the payment has already been marked successful
    if (payment?.status === "successful")
      return res
        .status(400)
        .send(
          '<p style="color: red; font-weight: bold; text-align: center; font-size: 20px;">Payment details have already been used</p>'
        );

    // Fetch the group using the group ID from the payment info
    const group = await GroupModel.findById(payment.group._id);

    if (!group)
      return res
        .status(400)
        .send(
          '<p style="color: red; font-weight: bold; text-align: center; font-size: 20px;">Group not found</p>'
        );

    // Check if the user is a member of the group

    const member = await group.findMemberById(payment?.user?._id);
    if (!member)
      return res
        .status(400)
        .send(
          '<p style="color: red; font-weight: bold; text-align: center; font-size: 20px;">You are not a member of the group</p>'
        );

    // Verify the payment with Flutterwave
    const pResponse = await Flutterwave.verify(transaction_id);
    if (pResponse.status) {
      // Update the member's subscription and payment status
      await group.updateMemberSubscriptionStatus(payment.user, "active");
      await group.updateMemberPaymentActiveState(payment.user, true); // Use payment.user instead of user._id
      await payment.updateStatus("successful");
    } else {
      // Update payment status to failed if the verification was unsuccessful
      await payment.updateStatus("failed");
    }

    // Handle payment failure
    if (!pResponse.status)
      return res
        .status(400)
        .send(
          '<p style="color: red; font-weight: bold; text-align: center; font-size: 20px;">Payment failed</p>'
        );

    // Return success message
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
    const response = await Flutterwave.getBanks();
    return BuildHttpResponse(
      res,
      200,
      "Banks retrieved successfully",
      response
    );
  } catch (error) {
    return BuildHttpResponse(res, 500, error.message);
  }
};
