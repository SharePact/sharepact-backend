const mongoose = require('mongoose');
const { getPaginatedResults } = require('../utils/pagination');
const modelName = 'BankDetails';

const BankDetailsSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    accountName: { type: String, required: true },
    bankName: { type: String, required: true },
    accountNumber: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    methods: {
      async updateBankDetails({ accountName = null, bankName = null, accountNumber = null }) {
        if (accountName) this.accountName = accountName;
        if (bankName) this.bankName = bankName;
        if (accountNumber) this.accountNumber = accountNumber;
        this.updatedAt = Date.now();
        await this.save();
        return this;
      },
    },
    statics: {
      async createBankDetails({ user, accountName, bankName, accountNumber }) {
        const model = mongoose.model(modelName);
        const bankDetails = new model({
          user,
          accountName,
          bankName,
          accountNumber,
        });

        await bankDetails.save();
        return bankDetails;
      },
      async getBankDetailsByUser(userId) {
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