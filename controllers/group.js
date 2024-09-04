const GroupModel = require("../models/group");
const ChatRoomModel = require("../models/chatroom");
const ServiceModel = require("../models/service");
const PaymentInvoiceService = require("../notification/payment_invoice");

const { BuildHttpResponse } = require("../utils/response");

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
    const { groupId } = req.params;
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

    const service = await ServiceModel.findById(serviceId);
    if (!service) {
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

    return BuildHttpResponse(res, 201, "successful", newGroup);
  } catch (error) {
    return BuildHttpResponse(res, 500, error.message);
  }
};

exports.updateSubscriptionCost = async (req, res) => {
  try {
    const { groupId } = req.params;
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
  const { service_id } = req.params;
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
  const { id } = req.params;
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

    const group = await GroupModel.findbyGroupCode(groupCode);
    if (!group) {
      return BuildHttpResponse(res, 404, "Group not found");
    }

    if (await group.isUserAMember(userId)) {
      return BuildHttpResponse(
        res,
        400,
        "You are already a member of this group"
      );
    }

    if (group?.members?.length >= group?.numberOfMembers) {
      return BuildHttpResponse(res, 400, "Group is full");
    }

    // Add join request to the group
    await group.addJoinRequest({ userId, message });

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
    const { groupId, userId, approve } = req.body;
    const group = await GroupModel.findById(groupId).populate(
      "joinRequests.user",
      "username avatarUrl"
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

    if (joinRequestIndex === -1) {
      return BuildHttpResponse(res, 404, "Join request not found");
    }

    if (approve && approve == true) {
      if (!(await group.isUserAMember(userId))) {
        await group.addMember({
          userId,
          subscriptionStatus: "inactive",
          confirmStatus: false,
        });
        // Add member to chat room
        const chatRoom = await ChatRoomModel.findByGroupId(group._id);
        await chatRoom.addMember(userId);
      }
    }

    // Remove join request from the list whether it's approved or rejected
    await group.removeJoinRequestByIndex(joinRequestIndex);

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
    const { groupId } = req.params;
    const userId = req.user._id;

    const group = await GroupModel.findById(groupId)
      .populate("admin", "username avatarUrl")
      .populate({
        path: "members.user",
        select: "username avatarUrl",
      });

    if (!group) {
      return BuildHttpResponse(res, 404, "Group not found");
    }

    const service = await ServiceModel.findById(group.service);

    if (!service) {
      return BuildHttpResponse(res, 404, "Service not found");
    }

    const groupDetails = {
      ...group.toObject(),
      serviceName: service.serviceName,
      serviceLogo: service.logoUrl,
      nextSubscriptionDate: group.nextSubscriptionDate,
    };

    return BuildHttpResponse(res, 200, "successful", groupDetails);
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
    const { groupId } = req.params;
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
    const { groupId } = req.params;
    const group = await GroupModel.findById(groupId).populate(
      "admin",
      "username avatarUrl email"
    );

    if (!group) {
      return BuildHttpResponse(res, 404, "Group not found");
    }

    if (group.admin.toString() == req.user._id.toString()) {
      return BuildHttpResponse(res, 403, "admin cannot leave group");
    }

    await group.removeMember(req.user._id);

    await NotificationService.sendNotification({
      type: "memberRemovalUpdateForCreator",
      userId: group.admin._id,
      to: [group.admin.email],
      textContent: `Your member ${user.username} has left your group ${group.groupName}`,
      username: group.admin.username,
      groupName: group.groupName,
      content: `Your member ${user.username} has left your group ${group.groupName}`,
    });

    return BuildHttpResponse(res, 200, "successfully left group");
  } catch (error) {
    return BuildHttpResponse(res, 500, error.message);
  }
};

exports.UpdateConfirmStatus = async (req, res) => {
  try {
    const userId = req.user._id;
    const { groupId, action } = req.params;
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

    if (await group.haveAllMembersConfirmed()) {
      // TODO: transfer money to admin
    }

    return BuildHttpResponse(res, 200, "successfully updated status");
  } catch (error) {
    return BuildHttpResponse(res, 500, error.message);
  }
};
