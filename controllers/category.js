const Category = require("../models/category");
const { BuildHttpResponse } = require("../utils/response");
const { uploadBufferToCloudinary } = require("../utils/cloudinary");
const Service = require("../models/service");
const { ObjectId } = require("mongodb");
const mongoose = require("mongoose");

exports.createCategory = async (req, res) => {
  try {
    let result;
    if (req.file) {
      result = await uploadBufferToCloudinary(req.file.buffer);
    }

    if (!req.body.categoryName)
      return BuildHttpResponse(res, 400, "categoryName is required");

    const category = await Category.createCategory({
      categoryName: req.body.categoryName,
      imageUrl: result ? result.secure_url : "",
    });

    return BuildHttpResponse(
      res,
      201,
      "category created successfully",
      category
    );
  } catch (err) {
    return BuildHttpResponse(res, 500, err.message);
  }
};

exports.getAllCategories = async (req, res) => {
  const { page, limit } = req.pagination;
  try {
    const categories = await Category.getCategories(page, limit);
    return BuildHttpResponse(
      res,
      200,
      "successful",
      categories.results,
      categories.pagination
    );
  } catch (err) {
    return BuildHttpResponse(res, 500, err.message);
  }
};

exports.getCategoryById = async (req, res) => {
  let id = new ObjectId();
  try {
    id = mongoose.Types.ObjectId.createFromHexString(req.params.id);
  } catch (err) {
    return BuildHttpResponse(res, 404, "Category not found");
  }

  try {
    const category = await Category.findById(id);
    if (!category)
      return BuildHttpResponse(res, 404, "Category not found", category);

    const services = await Service.find({ categoryId: category._id });
    return BuildHttpResponse(res, 200, "successful", { category, services });
  } catch (err) {
    return BuildHttpResponse(res, 500, err.message);
  }
};

exports.updateCategory = async (req, res) => {
  let id = new ObjectId();
  try {
    id = mongoose.Types.ObjectId.createFromHexString(req.params.id);
  } catch (err) {
    return BuildHttpResponse(res, 404, "Category not found");
  }

  try {
    const category = await Category.findById(id);
    if (!category) return BuildHttpResponse(res, 404, "Category not found");

    let imageUrl = "";
    if (req.file) {
      const result = await uploadBufferToCloudinary(req.file.buffer);
      imageUrl = result?.secure_url;
    }
    category.updateCategory({ categoryName: req.body.categoryName, imageUrl });

    return BuildHttpResponse(res, 200, "successful", category);
  } catch (err) {
    return BuildHttpResponse(res, 500, err.message);
  }
};

exports.deleteCategory = async (req, res) => {
  let id = new ObjectId();
  try {
    id = mongoose.Types.ObjectId.createFromHexString(req.params.id);
  } catch (err) {
    return BuildHttpResponse(res, 404, "Category not found");
  }
  try {
    const category = await Category.findByIdAndDelete(id);
    if (!category) return BuildHttpResponse(res, 404, "Category not found");

    return BuildHttpResponse(res, 200, "Category deleted successfully");
  } catch (err) {
    return BuildHttpResponse(res, 500, err.message);
  }
};
