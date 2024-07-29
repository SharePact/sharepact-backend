// models/category.js
const mongoose = require("mongoose");
const { getPaginatedResults } = require("../utils/pagination");
const modelName = "Category";
const CategorySchema = new mongoose.Schema(
  {
    categoryName: { type: String, required: true, index: true },
    imageUrl: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    methods: {
      async updateCategory({ categoryName = null, imageUrl = null }) {
        if (categoryName) this.categoryName = categoryName;
        if (imageUrl) this.imageUrl = imageUrl;
        this.updatedAt = Date.now();
        await this.save();
        return this;
      },
    },
    statics: {
      async createCategory({ categoryName, imageUrl = "" }) {
        const model = mongoose.model(modelName);
        const category = new model({
          categoryName,
          imageUrl,
        });

        await category.save();
        return category;
      },
      async getCategories(page = 1, limit = 10) {
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

module.exports = mongoose.model(modelName, CategorySchema);
