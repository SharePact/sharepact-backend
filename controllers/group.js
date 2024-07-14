
const GroupModel = require('../models/group');
const ChatRoomModel = require('../models/chatroom');
const ServiceModel = require('../models/service');
const { v4: uuidv4 } = require('uuid');
const pdf = require('html-pdf');
const ejs = require('ejs');
const path = require('path');

const generateGroupCode = async () => {
    let code;
    let existingGroup;
    do {
        code = Math.floor(100000 + Math.random() * 900000).toString();
        existingGroup = await GroupModel.findOne({ groupCode: code });
    } while (existingGroup);
    return code;
};


const generateInvoice = async (group, user) => {
  const templatePath = path.join(__dirname, '../templates/invoice.ejs');
  const html = await ejs.renderFile(templatePath, { group, user });

  const pdfOptions = { format: 'Letter' };
  return new Promise((resolve, reject) => {
      pdf.create(html, pdfOptions).toBuffer((err, buffer) => {
          if (err) return reject(err);
          resolve(buffer);
      });
  });
};


exports.activateGroup = async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.user._id;

        const group = await GroupModel.findById(groupId)
            .populate('admin', 'username avatarUrl email')
            .populate({
                path: 'members.user',
                select: 'username avatarUrl email'
            });

        if (!group) {
            return res.status(404).json({ error: 'Group not found' });
        }

        if (group.admin._id.toString() !== userId.toString()) {
            return res.status(403).json({ error: 'Only the group admin can activate the group' });
        }

        if (group.activated) {
            return res.status(400).json({ error: 'Group is already activated' });
        }

        group.activated = true;
        group.nextSubscriptionDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

        await group.save();

        // Generate invoices for all members including admin
        const invoices = await Promise.all(group.members.map(async (member) => {
            const user = member.user;
            const buffer = await generateInvoice(group, user);
            return {
                user,
                buffer
            };
        }));

        // Also generate invoice for admin
        const adminBuffer = await generateInvoice(group, group.admin);

        // Send the invoices as a response for testing purposes
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=invoice-${group.groupCode}.pdf`);
        res.send(adminBuffer);

    } catch (error) {
        console.error('Error activating group:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.createGroup = async (req, res) => {
    try {
        const { serviceId, groupName, subscriptionPlan, numberOfMembers, existingGroup, nextSubscriptionDate } = req.body;
        const admin = req.user._id;

        if (numberOfMembers < 2 || numberOfMembers > 6) {
            return res.status(400).json({ error: 'Number of members must be between 2 and 6.' });
        }

        // Fetch service details
        const service = await ServiceModel.findById(serviceId);
        if (!service) {
            return res.status(404).json({ error: 'Service not found' });
        }

        // Find the subscription plan in the service
        const plan = service.subscriptionPlans.find(p => p.planName === subscriptionPlan);
        if (!plan) {
            return res.status(404).json({ error: 'Subscription plan not found' });
        }

        const totalMembers = numberOfMembers; // Admin counts as one member already
        const subscriptionCost = plan.price; // Updated to use 'price' instead of 'cost'
        const handlingFee = service.handlingFees;
        const totalCost = subscriptionCost;
        const individualShare = (subscriptionCost / totalMembers) + handlingFee;

        if (!subscriptionCost || !handlingFee || !totalCost || !individualShare || !admin) {
            throw new Error('Calculation error: missing required fields');
        }

        const groupCode = await generateGroupCode();

        const groupData = {
            subscriptionService: service.serviceName,
            serviceName: plan.planName,
            groupName,
            subscriptionPlan: plan.planName,
            numberOfMembers: totalMembers,
            subscriptionCost,
            handlingFee,
            individualShare,
            totalCost,
            groupCode,
            admin,
            members: [{
                user: admin,
                subscriptionStatus: 'inactive',
                confirmStatus: false
            }],
            existingGroup,
            activated: existingGroup,
            nextSubscriptionDate: existingGroup ? nextSubscriptionDate : undefined, // Set nextSubscriptionDate if it's an existing group
            joinRequests: [] // Initialize joinRequests as an empty array
        };

        const newGroup = new GroupModel(groupData);
        await newGroup.save();

        // Create a chat room for the group
        const chatRoom = new ChatRoomModel({ group: newGroup._id, members: [admin] });
        await chatRoom.save();

        res.status(201).json(newGroup);
    } catch (error) {
        console.error('Error creating group:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.requestToJoinGroup = async (req, res) => {
    try {
        const { groupCode, message } = req.body;
        const userId = req.user._id;

        const group = await GroupModel.findOne({ groupCode });

        if (!group) {
            return res.status(404).json({ error: 'Group not found' });
        }

        if (group.members.some(member => member.user && member.user.toString() === userId.toString())) {
            return res.status(400).json({ error: 'You are already a member of this group' });
        }

        if (group.members.length >= group.numberOfMembers) {
            return res.status(400).json({ error: 'Group is full' });
        }

        // Add join request to the group
        group.joinRequests.push({ user: userId, message });
        await group.save();

        res.status(200).json({ message: 'Request to join group sent successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.handleJoinRequest = async (req, res) => {
    try {
        const { groupId, userId, approve } = req.body;
        const group = await GroupModel.findById(groupId).populate('joinRequests.user', 'username avatarUrl');

        if (!group) {
            return res.status(404).json({ error: 'Group not found' });
        }

        if (group.admin.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Only the group admin can handle join requests' });
        }

        const joinRequestIndex = group.joinRequests.findIndex(req => req.user._id.toString() === userId);
        if (joinRequestIndex === -1) {
            return res.status(404).json({ error: 'Join request not found' });
        }

        if (approve) {
            if (!group.members.some(member => member.user.toString() === userId.toString())) {
                group.members.push({
                    user: userId,
                    subscriptionStatus: 'inactive',
                    confirmStatus: false
                });
                // Add member to chat room
                const chatRoom = await ChatRoomModel.findOne({ group: group._id });
                chatRoom.members.push(userId);
                await chatRoom.save();
            }
        }

        // Remove join request from the list whether it's approved or rejected
        group.joinRequests.splice(joinRequestIndex, 1);
        await group.save();

        res.status(200).json({ message: `User join request ${approve ? 'approved' : 'rejected'}` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getGroupDetails = async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.user._id;

        const group = await GroupModel.findById(groupId)
            .populate('admin', 'username avatarUrl')
            .populate({
                path: 'members.user',
                select: 'username avatarUrl'
            });

        if (!group) {
            return res.status(404).json({ error: 'Group not found' });
        }

        const service = await ServiceModel.findOne({ serviceName: group.subscriptionService });

        if (!service) {
            return res.status(404).json({ error: 'Service not found' });
        }

        const isMember = group.members.some(member => member.user && member.user._id.toString() === userId.toString());

        const groupDetails = {
            subscriptionService: group.subscriptionService,
            serviceName: group.serviceName,
            groupName: group.groupName,
            subscriptionPlan: group.subscriptionPlan,
            numberOfMembers: group.numberOfMembers,
            subscriptionCost: group.subscriptionCost,
            handlingFee: group.handlingFee,
            individualShare: group.individualShare,
            totalCost: group.totalCost,
            admin: {
                _id: group.admin._id,
                username: group.admin.username,
                avatarUrl: group.admin.avatarUrl
            },
            memberCount: group.members.length,
            createdAt: group.createdAt,
            serviceLogo: service.logoUrl,
            serviceDescription: service.subscriptionPlans.find(plan => plan.planName === group.subscriptionPlan)?.description || [],
            existingGroup: group.existingGroup,
            activated: group.activated,
            nextSubscriptionDate: group.nextSubscriptionDate, // Include nextSubscriptionDate in response
            joinRequestCount: group.joinRequests.length // Number of join requests
        };

        if (isMember) {
            groupDetails.members = group.members.map(member => ({
                user: {
                    _id: member.user._id,
                    username: member.user.username,
                    avatarUrl: member.user.avatarUrl
                },
                subscriptionStatus: member.subscriptionStatus,
                confirmStatus: member.confirmStatus
            }));
            groupDetails.groupCode = group.groupCode;
            groupDetails.joinRequests = group.admin._id.toString() === userId.toString() ? group.joinRequests : [];
        } else {
            groupDetails.members = group.members.map(member => ({
                user: {
                    _id: member.user._id,
                    username: member.user.username,
                    avatarUrl: member.user.avatarUrl
                }
            }));
        }

        res.status(200).json(groupDetails);
    } catch (error) {
        console.error('Error fetching group details:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getJoinRequests = async (req, res) => {
  try {
      const { groupId } = req.params;
      const group = await GroupModel.findById(groupId).populate('joinRequests.user', 'username avatarUrl');

      if (!group) {
          return res.status(404).json({ error: 'Group not found' });
      }

      if (group.admin.toString() !== req.user._id.toString()) {
          return res.status(403).json({ error: 'Only the group admin can view join requests' });
      }

      const joinRequestCount = group.joinRequests.length;

      if (joinRequestCount === 0) {
          return res.status(200).json({ message: 'No pending join requests', joinRequestCount });
      }

      res.status(200).json({ joinRequests: group.joinRequests, joinRequestCount });
  } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error' });
  }
};
