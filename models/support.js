const { Schema, model, Types } = require("mongoose");
const { getPaginatedResults } = require("../utils/pagination");

const modelName = "SupportTicket";
const SupportTicketSchema = new Schema(
  {
    name: { type: String },
    email: { type: String, required: true, index: true },
    message: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    resolved: { type: Boolean, default: false },
    resolvedAt: { type: Date },
  },
  {
    methods: {
      async resolveTicket() {
        this.resolved = true;
        this.resolvedAt = new Date();
        this.save();
        return this;
      },
    },
    statics: {
      async createSupportTicket({ name, email, message }) {
        const contactSupport = new this({ name, email, message });
        await contactSupport.save();
        return contactSupport;
      },
      async getUnresolvedSupportTickets(page = 1, limit = 10) {
        const query = { resolved: false };
        return await getPaginatedResults(this, page, limit, query);
      },
      async getAllSupportTickets(page = 1, limit = 10, resolved = null) {
        const query = {};
        if (resolved) query.resolved = resolved;
        const options = { sort: { createdAt: -1 } };
        return await getPaginatedResults(this, page, limit, query, {}, options);
      },

      async resolveSupportTicket(contactId) {
        const contact = await this.findById(contactId);
        if (!contact) {
          throw new Error("Contact not found");
        }
        contact.resolved = true;
        await contact.save();
        return contact;
      },
    },
  }
);

const SupportTicketModel = model(modelName, SupportTicketSchema);

module.exports = SupportTicketModel;
