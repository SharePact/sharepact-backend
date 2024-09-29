const GroupModel = require("../models/group");
const ChatRoomModel = require("../models/chatroom");
const ServiceModel = require("../models/service");
const Message = require("../models/message");
const PaymentInvoiceService = require("../notification/payment_invoice");
const NotificationService = require("../notification/index");
const { BuildHttpResponse } = require("../utils/response");
const inAppNotificationService = require("../notification/inapp");
const { ObjectId } = require("mongodb");
const mongoose = require("mongoose");

const generateGroupCode = async () => {
  let code;
  let existingGroup;
  do {
    code = Math.floor(100000 + Math.random() * 900000).toString();
    existingGroup = await GroupModel.findbyGroupCode(code);
  } while (existingGroup);
  return code;
};
exports.activateGroup = async (req, res) => {
  try {
    const { groupId: groupIdStr } = req.params;
    let groupId = new ObjectId();
    try {
      groupId = mongoose.Types.ObjectId.createFromHexString(
        groupIdStr.toString()
      );
    } catch (err) {
      return BuildHttpResponse(res, 404, `Group not found`);
    }
    const userId = req.user._id;

    const group = await GroupModel.findById(groupId)
      .populate("admin", "username avatarUrl email")
      .populate({
        path: "members.user",
        select: "username avatarUrl email",
      });

    if (!group) {
      return BuildHttpResponse(res, 404, "Group not found");
    }

    if (group.admin._id.toString() !== userId.toString()) {
      return BuildHttpResponse(
        res,
        403,
        "Only the group admin can activate the group"
      );
    }

    if (group.activated) {
      return BuildHttpResponse(res, 400, "Group is already activated");
    }

    group.activated = true;

    if (!group.oneTimePayment) {
      group.nextSubscriptionDate = new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000
      ); // 30 days from now
    }

    // Generate invoices for all members including admin
    await PaymentInvoiceService.sendToGroup({ group });
    await group.save();

    return BuildHttpResponse(res, 200, "invoices sent");
  } catch (error) {
    return BuildHttpResponse(res, 500, error.message);
  }
};

exports.createGroup = async (req, res) => {
  try {
    const {
      serviceId,
      groupName,
      subscriptionCost,
      numberOfMembers,
      oneTimePayment,
      existingGroup,
      nextSubscriptionDate,
    } = req.body;
    const admin = req.user._id;

    if (numberOfMembers < 2 || numberOfMembers > 6) {
      return BuildHttpResponse(
        res,
        400,
        "Number of members must be between 2 and 6."
      );
    }

    let service;
    try {
      service = await ServiceModel.findById(serviceId);
      if (!service) {
        return BuildHttpResponse(res, 404, "Service not found");
      }
    } catch (error) {
      return BuildHttpResponse(res, 404, "Service not found");
    }

    const totalMembers = numberOfMembers;
    const handlingFee = service.handlingFees;
    const individualShare = subscriptionCost / totalMembers + handlingFee;

    if (!subscriptionCost || !handlingFee || !individualShare || !admin) {
      throw new Error("Calculation error: missing required fields");
    }

    const groupCode = await generateGroupCode();

    const newGroup = await GroupModel.createGroup({
      service: service._id,
      groupName,
      numberOfMembers: totalMembers,
      subscriptionCost,
      handlingFee,
      individualShare,
      groupCode,
      admin,
      members: [
        {
          user: admin,
          subscriptionStatus: "inactive",
          confirmStatus: false,
        },
      ],
      oneTimePayment,
      existingGroup,
      activated: existingGroup,
      nextSubscriptionDate: oneTimePayment ? undefined : nextSubscriptionDate, // Set nextSubscriptionDate only if oneTimePayment is false
      joinRequests: [],
    });

    const chatRoom = await ChatRoomModel.createChatRoom({
      groupId: newGroup._id,
      members: [admin],
    });
    // Notify admin of group creation
    await NotificationService.sendNotification({
      type: "groupcreation",
      userId: admin,
      to: [req.user.email],
      textContent: `Your group "${newGroup.groupName}" has been successfully created.`,
      groupCode: newGroup.groupCode,
    });

    return BuildHttpResponse(res, 201, "successful", newGroup);
  } catch (error) {
    return BuildHttpResponse(res, 500, error.message);
  }
};

exports.updateSubscriptionCost = async (req, res) => {
  try {
    const { groupId: groupIdStr } = req.params;
    let groupId = new ObjectId();
    try {
      groupId = mongoose.Types.ObjectId.createFromHexString(
        groupIdStr.toString()
      );
    } catch (err) {
      return BuildHttpResponse(res, 404, `Group not found`);
    }

    const { newSubscriptionCost } = req.body;
    const userId = req.user._id;

    if (
      !newSubscriptionCost ||
      isNaN(newSubscriptionCost) ||
      newSubscriptionCost <= 0
    ) {
      return BuildHttpResponse(res, 400, "Invalid subscription cost");
    }

    const group = await GroupModel.findById(groupId);
    if (!group) {
      return BuildHttpResponse(res, 404, "Group not found");
    }

    if (group.admin.toString() !== userId.toString()) {
      return BuildHttpResponse(
        res,
        403,
        "Only the group admin can update the subscription cost"
      );
    }

    group.subscriptionCost = newSubscriptionCost;

    // Recalculate the individual share if needed
    const service = await ServiceModel.findById(group.service);
    if (service) {
      const handlingFee = service.handlingFees;
      const totalMembers = group.numberOfMembers;
      group.individualShare = newSubscriptionCost / totalMembers + handlingFee;
    }

    await group.save();
    return BuildHttpResponse(
      res,
      200,
      "Subscription cost updated successfully",
      group
    );
  } catch (error) {
    return BuildHttpResponse(res, 500, error.message);
  }
};

exports.getGroupsByServiceId = async (req, res) => {
  const { service_id: serviceId } = req.params;
  let service_id = new ObjectId();
  try {
    service_id = mongoose.Types.ObjectId.createFromHexString(serviceId);
  } catch (err) {
    return BuildHttpResponse(res, 404, `Service not found`);
  }
  const { page, limit } = req.pagination;
  try {
    const userId = req.user._id;
    const groups = await GroupModel.getGroupsByServiceId(
      userId,
      service_id,
      page,
      limit
    );
    return BuildHttpResponse(
      res,
      200,
      "Groups fetched successfully",
      groups.results,
      groups.pagination
    );
  } catch (error) {
    return BuildHttpResponse(res, 500, error.message);
  }
};

exports.getGroups = async (req, res) => {
  const { page, limit } = req.pagination;
  try {
    let { search, active, subscription_status, oneTimePayment } = req.query;
    const userId = req.user._id;
    const groups = await GroupModel.getGroups(
      userId,
      page,
      limit,
      search ?? "",
      active ?? null,
      subscription_status ?? null,
      oneTimePayment !== undefined ? oneTimePayment : null
    );
    return BuildHttpResponse(
      res,
      200,
      "Groups fetched successfully",
      groups.results,
      groups.pagination
    );
  } catch (error) {
    return BuildHttpResponse(res, 500, error.message);
  }
};

exports.deleteGroup = async (req, res) => {
  const { id: groupIdStr } = req.params;
  let id = new ObjectId();
  try {
    id = mongoose.Types.ObjectId.createFromHexString(groupIdStr.toString());
  } catch (err) {
    return BuildHttpResponse(res, 404, `Group not found`);
  }
  try {
    const group = await GroupModel.findById(id);
    if (!group) return BuildHttpResponse(res, 404, "group not found");

    if (!(await group.isAdmin(req.user._id))) {
      return BuildHttpResponse(
        res,
        403,
        "Only the group admin can delete group"
      );
    }

    const deletedGroup = await GroupModel.findByIdAndDelete(id);
    if (!deletedGroup) {
      return BuildHttpResponse(res, 404, "group not found");
    }

    return BuildHttpResponse(res, 200, "delete successful");
  } catch (error) {
    return BuildHttpResponse(res, 500, error.message);
  }
};
exports.requestToJoinGroup = async (req, res) => {
  try {
    const { groupCode, message } = req.body;
    const userId = req.user._id;

    // Find the group by its groupCode
    const group = await GroupModel.findOne({ groupCode }).populate(
      "admin",
      "email deviceToken"
    );
    if (!group) {
      return BuildHttpResponse(res, 404, "Group not found");
    }

    // Check if the user is already a member
    if (await group.isUserAMember(userId)) {
      return BuildHttpResponse(
        res,
        400,
        "You are already a member of this group"
      );
    }

    // Check if the group is full
    if (group.members.length >= group.numberOfMembers) {
      return BuildHttpResponse(res, 400, "Group is full");
    }

    // Check if the user already has a pending join request
    const existingRequest = group.joinRequests.find(
      (request) => request.user.toString() === userId.toString()
    );
    if (existingRequest) {
      return BuildHttpResponse(
        res,
        400,
        "You already have a pending request. Please wait for the admin to accept you."
      );
    }

    // Add join request to the group
    group.joinRequests.push({ user: userId, message });
    await group.save();

    // Log the user and admin's device token
    console.log("User ID for join request:", req.user?._id); // Log the user making the request
    console.log("Admin device token:", group?.admin?.deviceToken); // Log the admin's device token

    if (group?.admin?.deviceToken) {
      try {
        await inAppNotificationService.sendNotification({
          medium: "token",
          topicTokenOrGroupId: group?.admin?.deviceToken,
          name: "joinrequest",
          userId: req.user._id,
          groupId: group._id,
          memberId: userId,
        });
        console.log("In-app notification sent successfully.");
      } catch (error) {
        console.error("Failed to send in-app notification:", error.message);
      }
    } else {
      console.log("No device token found for the admin.");
    }

    // Send email notification to the admin
    await NotificationService.sendNotification({
      type: "joinrequest",
      userId: group.admin._id,
      to: [group.admin.email],
      textContent: `A member ${req.user.username} wants to join your group ${group.groupName}`,
      username: group.admin.username,
      groupName: group.groupName,
      content: `A member ${req.user.username} wants to join your group ${group.groupName}`,
    });

    return BuildHttpResponse(
      res,
      200,
      "Request to join group sent successfully"
    );
  } catch (error) {
    return BuildHttpResponse(res, 500, error.message);
  }
};

exports.handleJoinRequest = async (req, res) => {
  try {
    // TODO: use zod ZodMiddleware
    const { groupId: groupIdStr, userId, approve } = req.body;
    let groupId = new ObjectId();
    try {
      groupId = mongoose.Types.ObjectId.createFromHexString(
        groupIdStr.toString()
      );
    } catch (err) {
      return BuildHttpResponse(res, 404, `Group not found`);
    }

    const group = await GroupModel.findById(groupId).populate(
      "joinRequests.user",
      "username avatarUrl deviceToken email"
    );

    if (!group) {
      return BuildHttpResponse(res, 404, "Group not found");
    }

    if (!(await group.isAdmin(req.user._id))) {
      return BuildHttpResponse(
        res,
        403,
        "Only the group admin can handle join requests"
      );
    }

    const joinRequestIndex = await group.findJoinRequestIndexByUserId(userId);
    const memberRequest = group?.joinRequests[joinRequestIndex];
    if (joinRequestIndex === -1) {
      return BuildHttpResponse(res, 404, "Join request not found");
    }

    let isApprove = false;
    if (approve && approve == true) isApprove = true;

    if (isApprove) {
      if (!(await group.isUserAMember(userId))) {
        await group.addMember({
          userId,
          subscriptionStatus: "inactive",
          confirmStatus: false,
        });
        // Add member to chat room
        const chatRoom = await ChatRoomModel.findByGroupId(group._id);
        await chatRoom.addMember(userId);

        // Admin has either approved/rejected your request
        if (memberRequest?.user?.deviceToken) {
          await inAppNotificationService.sendNotification({
            medium: "token",
            topicTokenOrGroupId: memberRequest?.user?.deviceToken,
            name: "joinRequestAccepted",
            userId: userId,
            groupId: group._id,
          });
        }
      }
    } else {
      if (memberRequest?.user?.deviceToken) {
        await inAppNotificationService.sendNotification({
          medium: "token",
          topicTokenOrGroupId: memberRequest?.user?.deviceToken,
          name: "joinRequestRejected",
          userId: userId,
          groupId: group._id,
        });
      }
    }

    // Remove join request from the list whether it's approved or rejected
    await group.removeJoinRequestByIndex(joinRequestIndex);

    // Send notification to the user
    await NotificationService.sendNotification({
      type: "requestdecision",
      userId: memberRequest?.user?._id,
      to: [memberRequest?.user?.email],
      textContent: `Your request to join ${group.groupName} has been ${
        isApprove ? "approved" : "rejected"
      }`,
      groupName: group.groupName,
      textContent: `Your request to join ${group.groupName} has been ${
        isApprove ? "approved" : "rejected"
      }`,
      subject: `${isApprove ? "Approved" : "Rejected"} join request to ${
        group.groupName
      }`,
    });

    return BuildHttpResponse(
      res,
      200,
      `User join request ${approve ? "approved" : "rejected"}`
    );
  } catch (error) {
    return BuildHttpResponse(res, 500, error.message);
  }
};

exports.getGroupDetails = async (req, res) => {
  try {
    const { groupId: groupIdStr } = req.params;
    let groupId = new ObjectId();
    try {
      groupId = mongoose.Types.ObjectId.createFromHexString(
        groupIdStr.toString()
      );
    } catch (err) {
      return BuildHttpResponse(res, 404, `Group not found`);
    }
    const userId = req.user._id;

    // Find the group and populate the necessary fields
    const group = await GroupModel.findById(groupId)
      .populate("admin", "username avatarUrl")
      .populate({
        path: "members.user",
        select: "username avatarUrl",
      })
      .populate({
        path: "joinRequests.user",
        select: "username avatarUrl",
      });

    if (!group) {
      return BuildHttpResponse(res, 404, "Group not found");
    }

    // Find the associated service
    const service = await ServiceModel.findById(group.service);

    if (!service) {
      return BuildHttpResponse(res, 404, "Service not found");
    }

    // Build the group details object, with joinRequests now having user details
    const groupDetails = {
      ...group.toObject(),
      serviceName: service.serviceName,
      serviceDescription: service.serviceDescription,
      serviceLogo: service.logoUrl,
      nextSubscriptionDate: group.nextSubscriptionDate,
      joinRequests: group.joinRequests.map((request) => ({
        user: {
          _id: request.user._id,
          username: request.user.username,
          avatarUrl: request.user.avatarUrl,
        },
        message: request.message,
        _id: request._id,
      })),
    };

    // Check if the requesting user is the admin
    if (group.admin._id.toString() !== userId.toString()) {
      // If not the admin, remove the joinRequests field from the response
      delete groupDetails.joinRequests;
    }

    return BuildHttpResponse(res, 200, "successful", groupDetails);
  } catch (error) {
    return BuildHttpResponse(res, 500, error.message);
  }
};

exports.getGroupsList = async (req, res) => {
  const { page, limit } = req.pagination;
  try {
    const userId = req.user._id;

    // Fetch groups that the user belongs to
    const groups = await GroupModel.getGroups(userId, page, limit);

    // Fetch latest message and unread count for each group
    const groupsWithDetails = await Promise.all(
      groups.results.map(async (group) => {
        const unreadMessages = await Message.getUnreadMessagesCountByGroup(
          userId,
          group._id
        );
        const latestMessage = await Message.getLatestMessageByGroup(group._id);

        return {
          ...group.toObject(),
          unreadMessages,
          latestMessage,
          latestMessageTime: latestMessage ? latestMessage.createdAt : null,
        };
      })
    );

    // Sort groups by the latest message timestamp, newest first
    const sortedGroups = groupsWithDetails.sort((a, b) => {
      return new Date(b.latestMessageTime) - new Date(a.latestMessageTime);
    });

    return BuildHttpResponse(res, 200, "Groups fetched successfully", {
      groups: sortedGroups,
      pagination: groups.pagination,
    });
  } catch (error) {
    return BuildHttpResponse(res, 500, error.message);
  }
};

exports.getGroupDetailsByCode = async (req, res) => {
  try {
    const { groupCode } = req.params;
    const userId = req.user._id;

    const groupByCode = await GroupModel.findbyGroupCode(groupCode);
    if (!groupByCode) {
      return BuildHttpResponse(res, 404, "Group not found");
    }

    const group = await GroupModel.findById(groupByCode._id)
      .populate("admin", "username avatarUrl")
      .populate({
        path: "members.user",
        select: "username avatarUrl",
      });

    const service = await ServiceModel.findById(group.service);

    if (!service) {
      return BuildHttpResponse(res, 404, "Service not found");
    }

    const groupDetails = await group.groupDetails(userId, service._id);
    return BuildHttpResponse(res, 200, "successful", groupDetails);
  } catch (error) {
    return BuildHttpResponse(res, 500, error.message);
  }
};

exports.getJoinRequests = async (req, res) => {
  try {
    const { groupId: groupIdStr } = req.params;
    let groupId = new ObjectId();
    try {
      groupId = mongoose.Types.ObjectId.createFromHexString(
        groupIdStr.toString()
      );
    } catch (err) {
      return BuildHttpResponse(res, 404, `Group not found`);
    }
    const group = await GroupModel.findById(groupId).populate(
      "joinRequests.user",
      "username avatarUrl"
    );

    if (!group) {
      return BuildHttpResponse(res, 404, "Group not found");
    }

    if (group.admin.toString() !== req.user._id.toString()) {
      return BuildHttpResponse(
        res,
        403,
        "Only the group admin can view join requests"
      );
    }

    if ((group.joinRequests ?? []).length === 0) {
      return BuildHttpResponse(
        res,
        200,
        "No pending join requests",
        group.joinRequests ?? []
      );
    }

    return BuildHttpResponse(
      res,
      200,
      "retreived pending requests",
      group.joinRequests ?? []
    );
  } catch (error) {
    return BuildHttpResponse(res, 500, error.message);
  }
};

exports.leaveGroup = async (req, res) => {
  try {
    const { groupId: groupIdStr } = req.params;
    let groupId = new ObjectId();
    try {
      groupId = mongoose.Types.ObjectId.createFromHexString(
        groupIdStr.toString()
      );
    } catch (err) {
      return BuildHttpResponse(res, 404, `Group not found`);
    }

    // Fetch the group and populate admin and members fields
    const group = await GroupModel.findById(groupId)
      .populate("admin", "username avatarUrl email deviceToken")
      .populate("members.user", "_id username"); // ensure members.user is populated

    // Check if the group exists
    if (!group) {
      return BuildHttpResponse(res, 404, "Group not found");
    }

    // Check if the current user is the admin
    if (group.admin && group.admin._id.toString() === req.user._id.toString()) {
      return BuildHttpResponse(res, 403, "Admin cannot leave the group");
    }

    // Check if the user is a member of the group
    const isMember = group.members.some(
      (member) =>
        member.user && member.user._id.toString() === req.user._id.toString()
    );

    if (!isMember) {
      return BuildHttpResponse(res, 400, "You are not a member of this group");
    }

    // Remove the user from the group members
    group.members = group.members.filter(
      (member) => member.user._id.toString() !== req.user._id.toString()
    );
    await group.save();

    // Send notification to the admin
    await NotificationService.sendNotification({
      type: "memberRemovalUpdateForCreator",
      userId: group.admin._id,
      to: [group.admin.email],
      textContent: `Your member ${req.user.username} has left your group ${group.groupName}`,
      username: group.admin.username,
      groupName: group.groupName,
      content: `Your member ${req.user.username} has left your group ${group.groupName}`,
    });

    if (group?.admin?.deviceToken) {
      await inAppNotificationService.sendNotification({
        medium: "token",
        topicTokenOrGroupId: group?.admin?.deviceToken,
        name: "memberRemovalUpdateForCreator",
        userId: group.admin._id,
        groupId: group._id,
        memberId: req.user._id,
      });
    }

    return BuildHttpResponse(res, 200, "Successfully left the group");
  } catch (error) {
    return BuildHttpResponse(res, 500, error.message);
  }
};

exports.UpdateConfirmStatus = async (req, res) => {
  try {
    const userId = req.user._id;
    const { groupId: groupIdStr, action } = req.params;
    let groupId = new ObjectId();
    try {
      groupId = mongoose.Types.ObjectId.createFromHexString(
        groupIdStr.toString()
      );
    } catch (err) {
      return BuildHttpResponse(res, 404, `Group not found`);
    }
    if (!["confirm", "unconfirm"].includes(action)) {
      return BuildHttpResponse(res, 404, "page not found");
    }

    const group = await GroupModel.findById(groupId);
    if (!group) {
      return BuildHttpResponse(res, 404, "Group not found");
    }

    await group.updateMemberConfirmStatus(userId, action == "confirm");

    if (!(await group.isMemberConfirmed(group.admin))) {
      await group.updateMemberConfirmStatus(group.admin, true);
    }

    const updatedGroup = await GroupModel.findById(groupId);
    let pendingCount = 0;

    for (const member of updatedGroup?.members) {
      if (!member.confirmStatus) pendingCount += 1;
    }

    const admin = await User.findById(group.admin._id);
    await NotificationService.sendNotification({
      type: "confirmedStatus",
      userId: admin._id,
      to: [admin.email],
      textContent: `Confirm Status updated by ${req.user.username} for ${group.groupName}`,
      username: admin.username,
      memberName: req.user.username,
      groupName: group.groupName,
      pendingCount,
      pendingMessage:
        pendingCount > 0
          ? "Reach out to members to confirm their statuses"
          : "",
    });

    if (admin?.deviceToken) {
      await inAppNotificationService.sendNotification({
        medium: "token",
        topicTokenOrGroupId: admin?.deviceToken,
        name: "confirmedStatus",
        userId: admin._id,
        groupId: group._id,
        memberId: req.user._id,
      });
    }

    return BuildHttpResponse(res, 200, "successfully updated status");
  } catch (error) {
    return BuildHttpResponse(res, 500, error.message);
  }
};
