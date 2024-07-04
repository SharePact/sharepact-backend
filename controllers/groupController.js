const { firestore, admin } = require('../firebase/admin');
const { UserModel, GroupModel, GroupJoinRequestModel } = require('../models');

// Function to calculate individual share
const calculateIndividualShare = (subscriptionCost, numberOfMembers) => {
  return subscriptionCost / numberOfMembers;
};

// Function to generate a random 4-digit code
const generateGroupCode = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

// Create a new group
exports.createGroup = async (req, res) => {
  try {
    const { subscriptionService, groupName, subscriptionPlan, numberOfMembers, 
      accessType, username, password } = req.body;
    
    const { uid } = req.user; // Assuming you have 'uid' from authenticated user
    
    // Validate input fields
    // if (!subscriptionService || !groupName || !subscriptionPlan || !numberOfMembers || !accessType) {
    //   return res.status(400).json({ error: 'Missing required fields' });
    // }

    if (accessType === 'login' && (!username || !password)) {
      return res.status(400).json({ error: 'Username and password are required for login access' });
    }

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
    // TODO: FIXXX THISS!
    const subscriptionCost = price || 10;
    const individualShare = calculateIndividualShare(subscriptionCost, numberOfMembers);

    // Calculate total cost including handling fee
    const handlingFee = parseFloat(handlingFees);
    const totalCost = individualShare + handlingFee;

    // Fetch admin's username from Firebase Authentication
    const userRecord = await admin.auth().getUser(uid);
    const adminUsername = userRecord.displayName || userRecord.email || 'Unknown';

    // Generate a unique group code
    const groupCode = generateGroupCode();

    // Create a new group document
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
      accessType,
      groupCode,
      admin: {
        uid,
        username: adminUsername
      },
      createdAt: new Date().toISOString(),
    };

    if (accessType === 'login') {
      groupData.username = username;
      groupData.password = password;
    }

    const groupRef = await firestore.collection('groups').add(groupData);
    const groupId = groupRef.id;

    // Create a group chat for the newly created group
    const chatData = {
      groupId,
      messages: [] // Start with an empty array of messages
    };

    await firestore.collection('chats').doc(groupId).set(chatData);

    // create group in mongo collection
    const admin = await UserModel.findOne({ uid })

    await GroupModel.create({
      ...groupData,
      admin: admin._id
    })

    return res.status(201).json({
      message: 'Group created successfully',
      id: groupId,
      groupCode,
      ...groupData
    });
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({ error: error.message });
  }
};

// Join a group by code
exports.joinGroupByCode = async (req, res) => {
  try {
    const { groupCode } = req.body;
    const { uid } = req.user; // Assuming you have 'uid' from authenticated user

    // TODO: Implement service endpoint for this!!!
    const user = await UserModel.findOne({ uid })

    // Fetch group details by group code
    let group = await GroupModel.findOne({ groupCode })

    // TODO: Implement NotFound error!!!
    if(!group) return res.status(404).json({ message: 'No group with this code was found' });

    // check for existing invite
    let invite = await GroupJoinRequestModel.findOne({ group: group._id, user })

    if(invite) return res.status(400).json({ message: 'You have already sent a request to join this group' })
    
    await GroupJoinRequestModel.create({
      group: group._id,
      user: user._id,
    })

    return res.status(200).json({ message: 'Join request sent to admin', groupId: group._id });
  } catch (error) {
    console.error('Error joining group by code:', error);
    return res.status(500).json({ error: error.message });
  }
};

// Admin accepts/rejects join requests for groups
exports.processJoinRequest = async (req, res) => {
  try {
    const { groupId, userId } = req.params;
    const { action } = req.body; // 'accept' or 'reject'

    // Fetch group details
    const groupRef = firestore.collection('groups').doc(groupId);
    const groupDoc = await groupRef.get();

    if (!groupDoc.exists) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const groupData = groupDoc.data();

    // Verify admin permission (assuming req.user.uid is admin's uid)
    if (req.user.uid !== groupData.admin.uid) {
      return res.status(403).json({ error: 'Unauthorized: Only admin can process join requests' });
    }

    // Check if join request exists
    const joinRequestRef = groupRef.collection('joinRequests').doc(userId);
    const joinRequestDoc = await joinRequestRef.get();

    if (!joinRequestDoc.exists) {
      return res.status(404).json({ error: 'Join request not found' });
    }

    // Process request
    if (action === 'accept') {
      // Add user to group chat (update logic as per your implementation)
      // Example: const chatRef = firestore.collection('chats').doc(groupId);
      // Example: chatRef.collection('members').doc(userId).set({});

      // Update join request status
      await joinRequestRef.update({ status: 'accepted' });

      return res.status(200).json({ message: 'User added to group chat' });
    } else if (action === 'reject') {
      // Update join request status
      await joinRequestRef.update({ status: 'rejected' });

      return res.status(200).json({ message: 'Join request rejected' });
    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('Error processing join request:', error);
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
