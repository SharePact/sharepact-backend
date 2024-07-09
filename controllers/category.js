const Category = require('../models/category');
const cloudinary = require('../config/cloudinary');

exports.createCategory = async (req, res) => {
  try {
    let result;
    if (req.file) {
      result = await cloudinary.uploader.upload(req.file.path);
    }
    
    const category = new Category({
      categoryName: req.body.categoryName,
      imageUrl: result ? result.secure_url : '',
    });

    await category.save();
    res.status(201).json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find();
    res.status(200).json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ error: 'Category not found' });
    res.status(200).json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ error: 'Category not found' });

    if (req.body.categoryName) category.categoryName = req.body.categoryName;

    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path);
      category.imageUrl = result.secure_url;
    }

    category.updatedAt = Date.now();
    await category.save();

    res.status(200).json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) return res.status(404).json({ error: 'Category not found' });

    res.status(200).json({ message: 'Category deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
