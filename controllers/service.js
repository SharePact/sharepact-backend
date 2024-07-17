const Service = require("../models/service");
const Category = require("../models/category");
const uploadFileToStorage = require("../utils/uploadfiletostorage");
const { v4: uuidv4 } = require("uuid");

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
      return res.status(400).json({ error: "Missing required fields" });
    }

    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
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

    const serviceData = {
      serviceName,
      serviceDescription,
      subscriptionPlans: JSON.parse(subscriptionPlans), // Convert JSON string to array
      currency,
      handlingFees,
      logoUrl,
      categoryId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const service = new Service(serviceData);
    await service.save();

    res.status(201).json({
      message: "Service created successfully",
      id: service._id,
      categoryName: category.categoryName, // Include category name in the response
      ...serviceData,
    });
  } catch (error) {
    console.error("Error creating service:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.getServices = async (req, res) => {
  const { page, limit } = req.pagination;
  try {
    const services = await Service.find();
    res
      .status(200)
      .json({ message: "Services fetched successfully", services });
  } catch (error) {
    console.error("Error fetching services:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.getServiceById = async (req, res) => {
  try {
    const { id } = req.params;
    const service = await Service.findById(id);
    if (!service) {
      return res.status(404).json({ error: "Service not found" });
    }

    const category = await Category.findById(service.categoryId);
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    res.status(200).json({
      message: "Service fetched successfully",
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

    if (
      !serviceName ||
      !serviceDescription ||
      !subscriptionPlans ||
      !currency ||
      !categoryId
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const serviceData = {
      serviceName,
      serviceDescription,
      subscriptionPlans: JSON.parse(subscriptionPlans), // Convert JSON string to array
      currency,
      handlingFees,
      categoryId,
      updatedAt: new Date(),
    };

    if (req.file) {
      const logoFile = req.file;
      const logoFileName = `${uuidv4()}_${logoFile.originalname}`;
      serviceData.logoUrl = await uploadFileToStorage(
        logoFile.buffer,
        logoFileName,
        logoFile.mimetype
      );
    }

    const updatedService = await Service.findByIdAndUpdate(id, serviceData, {
      new: true,
    });
    if (!updatedService) {
      return res.status(404).json({ error: "Service not found" });
    }

    res.status(200).json({
      message: "Service updated successfully",
      id,
      ...updatedService._doc,
    });
  } catch (error) {
    console.error("Error updating service:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.deleteService = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedService = await Service.findByIdAndDelete(id);
    if (!deletedService) {
      return res.status(404).json({ error: "Service not found" });
    }
    res.status(200).json({ message: "Service deleted successfully" });
  } catch (error) {
    console.error("Error deleting service:", error);
    res.status(500).json({ error: error.message });
  }
};
