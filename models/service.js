const mongoose = require("mongoose");
const { writeOnlyPlugin } = require("../utils/mongoose-plugins");
const { getPaginatedResults } = require("../utils/pagination");

export const serviceModelName = "Service";
const ServiceSchema = new mongoose.Schema(
  {
    serviceName: { type: String, required: true },
    serviceDescription: { type: String, required: true },
    // subscriptionPlans: { type: Array, required: true },
    currency: { type: String, required: true },
    handlingFees: { type: Number, required: true },
    logoUrl: { type: String },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    indexes: [{ fields: { categoryId: 1 } }],
    methods: {
      // async findSubscriptionPlan(planName) {
      //   const plan = this?.subscriptionPlans?.find(
      //     (p) => p.planName === planName
      //   );
      //   return plan;
      // },
      async updateService({
        serviceName = null,
        serviceDescription = null,
        // subscriptionPlans = null,
        currency = null,
        handlingFees = null,
        categoryId = null,
        logoUrl = null,
      }) {
        if (serviceName && serviceName != "") this.serviceName = serviceName;
        if (serviceDescription && serviceDescription != "")
          this.serviceDescription = serviceDescription;
        if (currency && currency != "") this.currency = currency;
        if (handlingFees && handlingFees != "")
          this.handlingFees = handlingFees;
        if (categoryId && categoryId != "") this.categoryId = categoryId;
        // if (subscriptionPlans) {
        //   const subPlans = JSON.parse(subscriptionPlans);
        //   if (subPlans?.length > 0) this.subscriptionPlans = subPlans;
        // }

        if (logoUrl && logoUrl != "") this.logoUrl = logoUrl;

        this.updatedAt = Date.now();
        await this.save();
        return this;
      },
    },
    statics: {
      async createService({
        serviceName,
        serviceDescription,
        // subscriptionPlans,
        currency,
        handlingFees,
        logoUrl,
        categoryId,
      }) {
        const model = mongoose.model(modelName);
        const newService = new model({
          serviceName,
          serviceDescription,
          // subscriptionPlans: JSON.parse(subscriptionPlans), // Convert JSON string to array
          currency,
          handlingFees,
          logoUrl,
          categoryId,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        await newService.save();
        return newService;
      },
      async getServices(page = 1, limit = 10, category = null) {
        const model = mongoose.model(modelName);
        let query = {};

        if (category) {
          query.categoryId = category;
        }
        const result = await getPaginatedResults(model, page, limit, query);
        return result;
      },
    },
  }
);
ServiceSchema.plugin(writeOnlyPlugin, { writeOnlyFields: [] });
module.exports = mongoose.model(modelName, ServiceSchema);
