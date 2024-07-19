const mongoose = require("mongoose");
const { getPaginatedResults } = require("../utils/pagination");
const modelName = "BankDetails";

const BankDetailsSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    accountName: { type: String, required: true },
    bankName: { type: String, required: true },
    accountNumber: { type: String, required: true },
    sortCode: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    methods: {
      async updateBankDetails({
        accountName = null,
        bankName = null,
        accountNumber = null,
        sortCode = null,
      }) {
        if (accountName) this.accountName = accountName;
        if (bankName) this.bankName = bankName;
        if (accountNumber) this.accountNumber = accountNumber;
        if (sortCode) this.sortCode = sortCode;
        this.updatedAt = Date.now();
        await this.save();
        return this;
      },
    },
    statics: {
      async createBankDetails({
        user,
        accountName,
        bankName,
        accountNumber,
        sortCode,
      }) {
        const model = mongoose.model(modelName);
        const bankDetails = new model({
          user,
          accountName,
          bankName,
          accountNumber,
          sortCode,
        });

        await bankDetails.save();
        return bankDetails;
      },
      async getByUserId(userId) {
        return await this.findOne({ user: userId });
      },
      async getBankDetails(page = 1, limit = 10) {
        const model = mongoose.model(modelName);
        const result = await getPaginatedResults(model, page, limit);
        return result;
      },
    },
  }
);

module.exports = mongoose.model(modelName, BankDetailsSchema);
