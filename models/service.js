const mongoose = require('mongoose');

const ServiceSchema = new mongoose.Schema({
  serviceName: { type: String, required: true },
  serviceDescription: { type: String, required: true },
  subscriptionPlans: { type: Array, required: true },
  currency: { type: String, required: true },
  handlingFees: { type: Number, required: true },
  logoUrl: { type: String },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Service', ServiceSchema);
