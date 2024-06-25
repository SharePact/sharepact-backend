const { firestore } = require('../firebase/admin');

// Function to calculate individual share
const calculateIndividualShare = (subscriptionCost, numberOfMembers) => {
  return subscriptionCost / numberOfMembers;
};

// Create a new group
exports.createGroup = async (req, res) => {
  try {
    const { subscriptionService, groupName, subscriptionPlan, numberOfMembers, groupPrivacy } = req.body;

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
    const groupsSnapshot = await firestore.collection('groups').get();
    const groups = groupsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(groups);
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({ error: error.message });
  }
};

// Fetch a specific group by ID
exports.getGroupById = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await firestore.collection('groups').doc(id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Group not found' });
    }
    res.status(200).json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error('Error fetching group:', error);
    res.status(500).json({ error: error.message });
  }
};
