const { firestore, storage } = require('../firebase/admin');
const { v4: uuidv4 } = require('uuid');

// Helper function to upload file to Firebase Storage
const uploadFileToStorage = async (fileBuffer, fileName, mimeType) => {
  const file = storage.file(`categories/${fileName}`);
  await file.save(fileBuffer, {
    metadata: { contentType: mimeType },
    public: true, // Optional: Make the file public
  });
  return `https://storage.googleapis.com/${storage.name}/categories/${fileName}`;
};

// Create a new category
const createCategory = async (req, res) => {
  try {
    const { categoryName } = req.body;

    if (!categoryName) {
      return res.status(400).json({ error: 'Missing required field: categoryName' });
    }

    const imageFile = req.file;
    let imageUrl = '';

    if (imageFile) {
      const imageFileName = `${uuidv4()}_${imageFile.originalname}`;
      imageUrl = await uploadFileToStorage(imageFile.buffer, imageFileName, imageFile.mimetype);
    }

    const categoryData = {
      categoryName,
      imageUrl,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = await firestore.collection('categories').add(categoryData);
    res.status(201).json({ message: 'Category created successfully', id: docRef.id, ...categoryData });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get all categories
const getCategories = async (req, res) => {
  try {
    const categoriesSnapshot = await firestore.collection('categories').get();
    const categories = categoriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json({ message: 'Categories fetched successfully', categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get a specific category by ID and its services
const getCategoryById = async (req, res) => {
    try {
      const { id } = req.params;
      const categoryDoc = await firestore.collection('categories').doc(id).get();
      if (!categoryDoc.exists) {
        return res.status(404).json({ error: 'Category not found' });
      }
  
      const servicesSnapshot = await firestore.collection('services').where('categoryId', '==', id).get();
      const services = servicesSnapshot.docs.map(doc => ({
        id: doc.id,
        logoUrl: doc.data().logoUrl,
      }));
  
      res.status(200).json({
        message: 'Category and services fetched successfully',
        category: { id: categoryDoc.id, ...categoryDoc.data() },
        services,
      });
    } catch (error) {
      console.error('Error fetching category:', error);
      res.status(500).json({ error: error.message });
    }
  };
  
// Update an existing category
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { categoryName } = req.body;

    if (!categoryName) {
      return res.status(400).json({ error: 'Missing required field: categoryName' });
    }

    const categoryData = {
      categoryName,
      updatedAt: new Date().toISOString(),
    };

    if (req.file) {
      const imageFile = req.file;
      const imageFileName = `${uuidv4()}_${imageFile.originalname}`;
      categoryData.imageUrl = await uploadFileToStorage(imageFile.buffer, imageFileName, imageFile.mimetype);
    }

    await firestore.collection('categories').doc(id).update(categoryData);
    res.status(200).json({ message: 'Category updated successfully', id, ...categoryData });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: error.message });
  }
};

// Delete a category
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    await firestore.collection('categories').doc(id).delete();
    res.status(200).json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
};
