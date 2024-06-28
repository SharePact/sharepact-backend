const { firestore, storage } = require('../firebase/admin');
const { v4: uuidv4 } = require('uuid');

// Helper function to upload file to Firebase Storage
const uploadFileToStorage = async (fileBuffer, fileName, mimeType) => {
  const file = storage.file(`logos/${fileName}`);
  await file.save(fileBuffer, {
    metadata: { contentType: mimeType },
    public: true, // Optional: Make the file public
  });
  return `https://storage.googleapis.com/${storage.name}/logos/${fileName}`;
};

// Create a new service
const createService = async (req, res) => {
  try {
    const {
      serviceName,
      serviceDescription,
      subscriptionPlans,
      currency,
      handlingFees,
      importantInformation,
      categoryId,
    } = req.body;

    if (!serviceName || !serviceDescription || !subscriptionPlans || !currency || !categoryId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const categoryDoc = await firestore.collection('categories').doc(categoryId).get();
    if (!categoryDoc.exists) {
      return res.status(404).json({ error: 'Category not found' });
    }
    const categoryName = categoryDoc.data().categoryName;

    const logoFile = req.file;
    let logoUrl = '';

    if (logoFile) {
      const logoFileName = `${uuidv4()}_${logoFile.originalname}`;
      logoUrl = await uploadFileToStorage(logoFile.buffer, logoFileName, logoFile.mimetype);
    }

    const serviceData = {
      serviceName,
      serviceDescription,
      subscriptionPlans: JSON.parse(subscriptionPlans), // Convert JSON string to array
      currency,
      handlingFees,
      importantInformation,
      logoUrl,
      categoryId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = await firestore.collection('services').add(serviceData);

    res.status(201).json({
      message: 'Service created successfully',
      id: docRef.id,
      categoryName, // Include category name in the response
      ...serviceData
    });
  } catch (error) {
    console.error('Error creating service:', error);
    res.status(500).json({ error: error.message });
  }
};



// Get all services
const getServices = async (req, res) => {
  try {
    const servicesSnapshot = await firestore.collection('services').get();
    const services = servicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json({ message: 'Services fetched successfully', services });
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get a specific service by ID
const getServiceById = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await firestore.collection('services').doc(id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Service not found' });
    }
    const serviceData = doc.data();

    const categoryDoc = await firestore.collection('categories').doc(serviceData.categoryId).get();
    if (!categoryDoc.exists) {
      return res.status(404).json({ error: 'Category not found' });
    }
    const categoryName = categoryDoc.data().categoryName;

    res.status(200).json({
      message: 'Service fetched successfully',
      id: doc.id,
      categoryName, // Include category name in the response
      ...serviceData
    });
  } catch (error) {
    console.error('Error fetching service:', error);
    res.status(500).json({ error: error.message });
  }
};

// Update an existing service
const updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      serviceName,
      serviceDescription,
      subscriptionPlans,
      currency,
      handlingFees,
      importantInformation,
      categoryId,
    } = req.body;

    if (!serviceName || !serviceDescription || !subscriptionPlans || !currency || categoryId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const serviceData = {
      serviceName,
      serviceDescription,
      subscriptionPlans: JSON.parse(subscriptionPlans), // Convert JSON string to array
      currency,
      handlingFees,
      importantInformation,
      categoryId,
      updatedAt: new Date().toISOString(),
    };

    if (req.file) {
      const logoFile = req.file;
      const logoFileName = `${uuidv4()}_${logoFile.originalname}`;
      serviceData.logoUrl = await uploadFileToStorage(logoFile.buffer, logoFileName, logoFile.mimetype);
    }

    await firestore.collection('services').doc(id).update(serviceData);
    res.status(200).json({ message: 'Service updated successfully', id, ...serviceData });
  } catch (error) {
    console.error('Error updating service:', error);
    res.status(500).json({ error: error.message });
  }
};

// Delete a service
const deleteService = async (req, res) => {
  try {
    const { id } = req.params;
    await firestore.collection('services').doc(id).delete();
    res.status(200).json({ message: 'Service deleted successfully' });
  } catch (error) {
    console.error('Error deleting service:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createService,
  getServices,
  getServiceById,
  updateService,
  deleteService,
};
