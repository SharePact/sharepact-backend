const Service = require("../models/service");
const Category = require("../models/category");
const uploadFileToStorage = require("../utils/uploadfiletostorage");
const { v4: uuidv4 } = require("uuid");
const { BuildHttpResponse } = require("../utils/response");

exports.createService = async (req, res) => {
  try {
    const {
      serviceName,
      serviceDescription,
      subscriptionPlans,
      currency,
      handlingFees,
      categoryId,
    } = req.body;

    if (
      !serviceName ||
      !serviceDescription ||
      !subscriptionPlans ||
      !currency ||
      !categoryId
    ) {
      return BuildHttpResponse(res, 400, "Missing required fields");
    }

    const category = await Category.findById(categoryId);
    if (!category) {
      return BuildHttpResponse(res, 404, "Category not found");
    }

    const logoFile = req.file;
    let logoUrl = "";

    if (logoFile) {
      const logoFileName = `${uuidv4()}_${logoFile.originalname}`;
      logoUrl = await uploadFileToStorage(
        logoFile.buffer,
        logoFileName,
        logoFile.mimetype
      );
    }

    const service = await Service.createService({
      serviceName,
      serviceDescription,
      subscriptionPlans,
      currency,
      handlingFees,
      logoUrl,
      categoryId,
    });

    return BuildHttpResponse(res, 201, "Service created successfully", {
      id: service._id,
      categoryName: category.categoryName, // Include category name in the response
      ...service.toJSON(),
    });
  } catch (error) {
    return BuildHttpResponse(res, 500, error.message);
  }
};

exports.getServices = async (req, res) => {
  const { page, limit } = req.pagination;
  try {
    const services = await Service.getServices(page, limit);
    return BuildHttpResponse(
      res,
      200,
      "Services fetched successfully",
      services.results,
      services.pagination
    );
  } catch (error) {
    return BuildHttpResponse(res, 500, error.message);
  }
};

exports.getServiceById = async (req, res) => {
  try {
    const { id } = req.params;
    const service = await Service.findById(id);
    if (!service) {
      return BuildHttpResponse(res, 404, "Service not found");
    }

    const category = await Category.findById(service.categoryId);
    if (!category) {
      return BuildHttpResponse(res, 404, "Category not found");
    }

    return BuildHttpResponse(res, 200, "Service fetched successfully", {
      id: service._id,
      categoryName: category.categoryName, // Include category name in the response
      ...service._doc,
    });
  } catch (error) {
    console.error("Error fetching service:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      serviceName,
      serviceDescription,
      subscriptionPlans,
      currency,
      handlingFees,
      categoryId,
    } = req.body;

    const service = await Service.findById(id);
    if (!service) {
      return BuildHttpResponse(res, 404, "Service not found");
    }

    let logoUrl = null;
    if (req.file) {
      const logoFile = req.file;
      const logoFileName = `${uuidv4()}_${logoFile.originalname}`;
      logoUrl = await uploadFileToStorage(
        logoFile.buffer,
        logoFileName,
        logoFile.mimetype
      );
    }

    await service.updateService({
      serviceName,
      serviceDescription,
      subscriptionPlans,
      currency,
      handlingFees,
      categoryId,
      logoUrl,
    });

    const category = await Category.findById(categoryId);
    if (!category) {
      return BuildHttpResponse(res, 404, "Category not found");
    }

    return BuildHttpResponse(res, 200, "Service updated successfully", {
      id: service._id,
      categoryName: category.categoryName, // Include category name in the response
      ...service.toJSON(),
    });
  } catch (error) {
    return BuildHttpResponse(res, 500, error.message);
  }
};

exports.deleteService = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedService = await Service.findByIdAndDelete(id);
    if (!deletedService) {
      return BuildHttpResponse(res, 404, "Service not found");
    }
    return BuildHttpResponse(res, 200, "Service deleted successfully");
  } catch (error) {
    return BuildHttpResponse(res, 500, err.message);
  }
};
