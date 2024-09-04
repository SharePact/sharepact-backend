const mongoose = require("mongoose");
const { getPaginatedResults } = require("../utils/pagination");

const modelName = "Waitlist";

const WaitlistSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true, match: [/.+@.+\..+/, 'Please enter a valid email address'] },
    createdAt: { type: Date, default: Date.now },
  },
  {
    methods: {
      async updateWaitlist({ name = null, email = null }) {
        if (name) this.name = name;
        if (email) this.email = email;
        this.updatedAt = Date.now();
        await this.save();
        return this;
      },
    },
    statics: {
      async createWaitlist({ name, email }) {
        const model = mongoose.model(modelName);
        const waitlistEntry = new model({ name, email });
        await waitlistEntry.save();
        return waitlistEntry;
      },
      async getWaitlists(page = 1, limit = 10) {
        const model = mongoose.model(modelName);
        const result = await getPaginatedResults(model, page, limit);
        return result;
      },
      async getById(id) {
        return await this.findById(id);
      },
    },
  }
);

module.exports = mongoose.model(modelName, WaitlistSchema);
