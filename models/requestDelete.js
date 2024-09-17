const mongoose = require("mongoose");
const { getPaginatedResults } = require("../utils/pagination");

const modelName = "requestdelete";

const RequestDeleteSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true, match: [/.+@.+\..+/, 'Please enter a valid email address'] },
    createdAt: { type: Date, default: Date.now },
  },
  {
    methods: {
      async updateRequestDelete({ name = null, email = null }) {
        if (name) this.name = name;
        if (email) this.email = email;
        this.updatedAt = Date.now();
        await this.save();
        return this;
      },
    },
    statics: {
      async createRequestDelete({ name, email }) {
        const requestdeleteEntry = new this({ name, email }); // Use 'this' to reference the current model
        await requestdeleteEntry.save();
        return requestdeleteEntry;
      },
      async getRequestDelete(page = 1, limit = 10) {
        const result = await getPaginatedResults(this, page, limit); // 'this' refers to the current model
        return result;
      },
      async getById(id) {
        return await this.findById(id); // 'this' refers to the current model
      },
    },
  }
);

module.exports = mongoose.model(modelName, RequestDeleteSchema);
