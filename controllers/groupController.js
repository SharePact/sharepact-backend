const { firestore, admin } = require('../firebase/admin');

// Function to calculate individual share
const calculateIndividualShare = (subscriptionCost, numberOfMembers) => {
  return subscriptionCost / numberOfMembers;
};

// Create a new group
exports.createGroup = async (req, res) => {
  try {
    const { subscriptionService, groupName, subscriptionPlan, numberOfMembers, groupPrivacy } = req.body;
    const { uid } = req.user; // Assuming you have 'uid' from authenticated user

    // Fetch service details for subscription cost and handling fees
    const serviceRef = firestore.collection('services').doc(subscriptionService);
    const serviceDoc = await serviceRef.get();

    if (!serviceDoc.exists) {
      return res.status(404).json({ error: 'Subscription service not found' });
    }

    const { serviceName, handlingFees, subscriptionPlans } = serviceDoc.data();

    // Find the selected subscription plan's price
    const selectedPlan = subscriptionPlans.find(plan => plan.plan === subscriptionPlan);
    if (!selectedPlan) {
      return res.status(400).json({ error: 'Invalid subscription plan' });
    }

    const { price } = selectedPlan;

    // Calculate subscription cost and individual share
    const subscriptionCost = price;
    const individualShare = calculateIndividualShare(subscriptionCost, numberOfMembers);

    // Calculate total cost including handling fee
    const handlingFee = parseFloat(handlingFees);
    const totalCost = individualShare + handlingFee;

    // Fetch admin's username from Firebase Authentication
    const userRecord = await admin.auth().getUser(uid);
    const adminUsername = userRecord.displayName || userRecord.email || 'Unknown';

    const groupData = {
      subscriptionService,
      serviceName,
      groupName,
      subscriptionPlan,
      numberOfMembers,
      subscriptionCost,
      handlingFee,
      individualShare,
      totalCost, 
      groupPrivacy: groupPrivacy === 'private', // Convert to boolean
      admin: {
        uid,
        username: adminUsername
      },
      createdAt: new Date().toISOString(),
    };

    const docRef = await firestore.collection('groups').add(groupData);
    res.status(201).json({ message: 'Group created successfully', id: docRef.id, ...groupData });
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({ error: error.message });
  }
};

// Fetch all groups
exports.getAllGroups = async (req, res) => {
    try {
      const groupsRef = firestore.collection('groups');
      const querySnapshot = await groupsRef.get();
  
      if (querySnapshot.empty) {
        return res.status(404).json({ error: 'No groups found' });
      }
  
      const groups = [];
      querySnapshot.forEach((doc) => {
        groups.push({ id: doc.id, ...doc.data() });
      });
  
      res.status(200).json({
        message: 'All groups fetched successfully',
        groups: groups
      });
    } catch (error) {
      console.error('Error fetching all groups:', error);
      res.status(500).json({ error: error.message });
    }
  };
// Fetch groups by subscription service
exports.getGroupsByService = async (req, res) => {
  const { serviceId } = req.params;

  try {
    const groupsRef = firestore.collection('groups');
    const querySnapshot = await groupsRef.where('subscriptionService', '==', serviceId).get();

    if (querySnapshot.empty) {
      return res.status(404).json({ error: 'No groups found for this service' });
    }

    // Fetch service name from Firestore based on serviceId
    const serviceDoc = await firestore.collection('services').doc(serviceId).get();
    if (!serviceDoc.exists) {
      return res.status(404).json({ error: 'Service not found' });
    }

    const { serviceName } = serviceDoc.data();

    const groups = [];
    querySnapshot.forEach((doc) => {
      groups.push({ id: doc.id, ...doc.data() });
    });

    res.status(200).json({
      message: `All groups for ${serviceName} fetched successfully`,
      groups: groups,
      serviceName: serviceName
    });
  } catch (error) {
    console.error('Error fetching groups by service:', error);
    res.status(500).json({ error: error.message });
  }
};
