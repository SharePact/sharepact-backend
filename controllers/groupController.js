const { request } = require('express');
const { firestore, admin } = require('../firebase/admin');
const { GroupModel, GroupJoinRequestModel, GroupMembershipModel, GroupPaymentModel, MessageModel } = require('../models');
const UserModel = require('../models/user')
const { NotFoundError } = require('../errors/not-found-error');
const { NotAuthorizedError } = require('../errors/not-authorized-error');
const { Types } = require('mongoose');
const { BadRequestError } = require('../errors/bad-request-error');
const { generatePaystackCheckoutLink } = require('../utils/payment');
const { plainWebSocketHandler } = require('../server');

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
      accessType } = req.body;
    
    const { uid } = req.user; // Assuming you have 'uid' from authenticated user
    const user = await UserModel.findById(uid);

    const existingGroup = await GroupModel.findOne({ user: user._id, subscriptionService })

    if(existingGroup) 
      throw new NotAuthorizedError("you have already created a group with similar service")

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
    const userRecord = await UserModel.findById(uid);
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
    const groupAdmin = await UserModel.findById(uid)

    await GroupModel.create({
      ...groupData,
      admin: groupAdmin._id
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
exports.requestToJoinGroup = async (req, res) => {
  try {
    const { serviceId, groupCode, message } = req.body;
    // const groupCode = req.params.groupId;
    const { uid } = req.user; // Assuming you have 'uid' from authenticated user

    // TODO: Implement service endpoint for this!!!
    const user = await UserModel.findById(uid)

    // Fetch group details by group code
    let group = await GroupModel.findOne({ 
      groupCode, 
      subscriptionService: new Types.ObjectId(serviceId) 
    });

    // group creator can not join group
    if(group.admin.toString() === user._id.toString())
      return res.status(400).json({ 
        message: 'Group admin can not join his own group' })

    // check if you're already on a group with the same service name
    let existingMember = await GroupMembershipModel.findOne({ user: user._id, 
      serviceId: group.subscriptionService })
    
    if(existingMember) return res.status(400).json({ 
      message: 'You have joined an existing service group.' })

    if(!group) throw new NotFoundError('No group with this code was found');

    // check for existing invite: whether you're already in the group or whether you've sent request
    let invite = 
    await GroupJoinRequestModel.findOne({ group: group._id, user: user._id }) || await GroupMembershipModel.findOne({ group: group._id, user: user._id })

    if(invite) return res.status(400).json({ message: 'You have already sent a request to join this group' })
    
    await GroupJoinRequestModel.create({
      group: group._id,
      user: user._id,
      serviceName: group.serviceName,
      message,
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
    const { requestId } = req.params;
    const { action } = req.body; // 'accept' or 'reject'

    let groupRequest = await GroupJoinRequestModel.findOne({ 
      _id: new Types.ObjectId(requestId), status: "pending" 
    })

    if(!groupRequest) return res.status(404).json({ message: 'No join request was found' });

    let group = await GroupModel.findOne({ _id: groupRequest.group })

    if(!group) return res.status(404).json({ message: 'No group was found' });

    let user = await UserModel.findById(req.user.uid);
    let groupAdmin = await UserModel.findOne({ _id: group.admin });

    // Verify admin permission (assuming req.user.uid is admin's uid)
    if (req.user.uid !== groupAdmin.id) {
      return res.status(403).json({ error: 'Unauthorized: Only admin can process join requests' });
    }

    // Process request
    if (action === 'accept') {
      // Add user to group chat (update logic as per your implementation)
      // Example: const chatRef = firestore.collection('chats').doc(groupId);
      // Example: chatRef.collection('members').doc(userId).set({});

      // TODO: verify number of members have not been exceeded
      // Update join request status
      group.members.push(user._id);
      await group.save()

      await GroupMembershipModel.create({ user: user._id, group: group._id, 
        serviceId: group.subscriptionService })

      groupRequest.status = "accepted"
      await groupRequest.save()

      return res.status(200).json({ message: 'User added to group chat' });
    } else if (action === 'reject') {
      // Update join request status
      groupRequest.status = "rejected"
      await groupRequest.save()
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


exports.editGroupDetails = async (req, res) => {
  let group = await GroupModel.findById(req.params.groupId);

  if(!group) throw new NotFoundError("group not found");

  let groupAdmin = await UserModel.findOne({ _id: group.admin });

  if(groupAdmin.id !== req.user.id) 
    throw new NotAuthorizedError("only the group admin can edit this group")
  
  let { activated } = req.body;

  if(group.activated && activated !== undefined) throw new BadRequestError("group has already been activated")
  
  if(!group.activated && activated){
    // activate group logic
    // send invoices basically
    // calculate amount based on handling fees and cost
    
    let members = await GroupMembershipModel.find({ group: group._id })

    const individualShare = calculateIndividualShare(group.subscriptionCost, members.length);
    // Calculate total cost including handling fee
    const handlingFee = parseFloat(group.handlingFee);
    const totalCost = individualShare + handlingFee;

    for(const member of members){
      await GroupPaymentModel.create({ member: member._id, amount: totalCost, user: member.user })
    }

    group.activated = true;
    await group.save()

    return res.json({ 
      status: "success", 
      message: "Successfully activated group. Invoices have been sent to all members"
    });
  }

  return res.json({ message: "Successfully updated group details." })
}

exports.listPendingGroupPayments = async (req, res) => {
  let payments = await GroupPaymentModel.find({
    user: new Types.ObjectId(req.user.uid), paid: false
  })

  return res.json({ payments })
}

exports.makeGroupPayment = async (req, res) => {
  let { paymentId } = req.params

  let payment = await GroupPaymentModel.findOne({_id: paymentId, user: new Types.ObjectId(req.user.uid) });

  if(!payment) throw new NotFoundError("no existing payment was found");

  if(payment.paid) throw new BadRequestError("you have already made this payment")

  let user = await UserModel.findById(req.user.uid);

  let { authorization_url, reference } = await generatePaystackCheckoutLink(user.email, payment.amount);

  payment.reference = reference;
  await payment.save()

  return res.json({
    checkoutLink: authorization_url,
    payment
  })
}


exports.listGroupMessages = async (req, res) => {
  let group = await GroupModel.findById(req.params.groupId);
  if(!group) throw new NotFoundError("group not found");

  let messages = await MessageModel.find({ group: group._id })

  return res.json({ messages, group })
}


exports.createGroupMessage = async (req, res) => {
  let user = await UserModel.findById(req.user.id);
  let group = await GroupModel.findById(req.params.groupId);
  if(!group) throw new NotFoundError("group not found");

  let { text } = req.body

  let message = await MessageModel.create({
    text,
    group: group._id,
    user: user._id
  })

  // broadcast message to all members except user
  let members = (await GroupMembershipModel.find({ group: group._id })).map(m => m.user.toString())
  members.push(group.admin.toString())

  members = members.filter(m => m !== req.user.uid);

  plainWebSocketHandler.broadcastMessage(members, message);

  return res.json({ message })
}


exports.toggleMemberReady = async (req, res) => {
  let user = await UserModel.findById(req.user.uid);
  let group = await GroupModel.findById(req.params.groupId);
  if(!group) throw new NotFoundError("group not found");

  let member = await GroupMembershipModel.findOne({ group: group._id, user: user._id })
  if(!member) throw new NotAuthorizedError("you are not a member of this group");

  if(!member.active) throw new NotAuthorizedError("only active members of group can be ready");

  let { ready } = req.body;

  member.ready = ready;
  await member.save();

  // check all members of group
  let groupMembers = await GroupMembershipModel.find({ group: group._id })
   
  if(groupMembers.every(m => m.ready)){
    // all members are ready
    // activate group
    group.activated = true;
    await group.save()
  }
}