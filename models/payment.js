const mongoose = require("mongoose");
const { Schema, model, Types } = mongoose;

const modelName = "Payment";

const PaymentSchema = new Schema(
  {
    reference: { type: String, required: true },
    user: { type: mongoose.Types.ObjectId, required: true, ref: "User" },
    group: { type: mongoose.Types.ObjectId, required: true, ref: "Group" },
    amount: { type: Number, required: true },
    currency: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "successful", "failed"],
      default: "pending",
    },
    disbursed: {
      type: String,
      enum: ["not-disbursed", "pending", "successful", "failed"],
      default: "not-disbursed",
    },
    disbursementId: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  {
    indexes: [
      { fields: { reference: 1 }, unique: true },
      { fields: { user: 1, group: 1 } },
    ],
    statics: {
      async createPayment({ reference, userId, groupId, amount, currency }) {
        const payment = new this({
          reference,
          user: userId,
          group: groupId,
          amount,
          currency,
        });
        return await payment.save();
      },

      async getPaymentByReference(reference) {
        return await this.findOne({ reference });
      },

      async updatePaymentStatus(reference, status) {
        if (!["pending", "successful", "failed"].includes(status)) {
          throw new Error("Invalid status");
        }
        return await this.findOneAndUpdate(
          { reference },
          { status },
          { new: true }
        );
      },
      async getPaymentsGroupedByDisbursementId(limit = 100) {
        return await this.aggregate([
          {
            $match: {
              disbursed: "pending",
              disbursementId: { $ne: "" },
            },
          },
          {
            $group: {
              _id: "$disbursementId",
              payments: { $push: "$$ROOT" },
            },
          },
          {
            $limit: limit,
          },
        ]);
      },
    },
    methods: {
      async updatePaymentReference(newReference) {
        this.reference = newReference;
        return await this.save();
      },
      async updateStatus(status) {
        this.status = status;
        return await this.save();
      },
      async updateDisbursedStatus(status) {
        this.disbursed = status;
        return await this.save();
      },
      async updateDisbursedStatusAndId(id, status) {
        this.disbursementId = id;
        this.disbursed = status;
        return await this.save();
      },
    },
  }
);

const PaymentModel = model(modelName, PaymentSchema);

module.exports = PaymentModel;
