const GroupModel = require("../models/group");
const ChatRoomModel = require("../models/chatroom");
const ServiceModel = require("../models/service");
const { v4: uuidv4 } = require("uuid");
const pdf = require("html-pdf");
const ejs = require("ejs");
const path = require("path");
const { BuildHttpResponse } = require("../utils/response");
const { sendEmailWithBrevo } = require("../notification/brevo");
const Paystack = require("../utils/paystack");
const PaymentModel = require("../models/payment");

const generateGroupCode = async () => {
  let code;
  let existingGroup;
  do {
    code = Math.floor(100000 + Math.random() * 900000).toString();
    existingGroup = await GroupModel.findbyGroupCode(code);
  } while (existingGroup);
  return code;
};

const generateInvoice = async (group, user) => {
  const templatePath = path.join(__dirname, "../templates/invoice.ejs");
  const cost = group.totalCost / group.members?.length;
  const amount = group.handlingFee + cost;
  const service = await ServiceModel.findById(group.service);

  const resp = await Paystack.getUrl({
    user_id: user._id,
    email: user.email,
    name: user.username,
    transaction_reference: uuidv4(),
    amount: amount,
    currency: "NGN",
    redirect_url: `${process.env?.APP_URL}/api/verify-payment`,
  });

  if (!resp.status) throw new Error("error generating payment link");
  console.log("88888888888888888, succeded");

  await PaymentModel.createPayment({
    reference: resp.reference,
    userId: user._id,
    groupId: group._id,
    amount,
    currency: service.currency,
  });
  const html = await ejs.renderFile(templatePath, {
    group,
    user,
    cost,
    amount,
    payment_link: resp.payment_link,
  });

  const pdfOptions = { format: "Letter" };
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
    group.nextSubscriptionDate = new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000
    ); // 30 days from now
    // TODO: Get subscription duration from service

    await group.save();

    // Generate invoices for all members including admin

    const invoices = await Promise.all(
      group.members.map(async (member) => {
        const user = member.user;
        const buffer = await generateInvoice(group, user);
        sendEmailWithBrevo({
          subject: `${group.groupName} - ${group.planName} invoice`,
          htmlContent: `<h2>Payment invoice for ${group.groupName} - ${group.planName} <h2>`,
          to: [{ email: user.email }],
          attachments: [{ name: "invoice.pdf", buffer: buffer }],
        });
        return {
          user,
          buffer,
        };
      })
    );

    // TODO: cleanup - removing this for now since admin is a member now
    // Also generate invoice for admin
    // const adminBuffer = await generateInvoice(group, group.admin);
    // sendEmailWithBrevo({
    //   subject: `${group.groupName} - ${group.planName} invoice`,
    //   htmlContent: `<h2>Payment invoice for ${group.groupName} - ${group.planName} <h2>`,
    //   to: [{ email: group.admin.email }],
    //   attachments: [{ name: "invoice.pdf", buffer: adminBuffer }],
    // });
    // console.log(33, group.admin._id);

    // Send the invoices as a response for testing purposes
    // res.setHeader("Content-Type", "application/pdf");
    // res.setHeader(
    //   "Content-Disposition",
    //   `attachment; filename=invoice-${group.groupCode}.pdf`
    // );
    // res.send(adminBuffer);
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
      subscriptionPlan,
      numberOfMembers,
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

    // Fetch service details
    const service = await ServiceModel.findById(serviceId);
    if (!service) {
      return BuildHttpResponse(res, 404, "Service not found");
    }

    // Find the subscription plan in the service
    const plan = await service.findSubscriptionPlan(subscriptionPlan);
    if (!plan) {
      return BuildHttpResponse(res, 404, "Subscription plan not found");
    }

    const totalMembers = numberOfMembers; // Admin counts as one member already
    const subscriptionCost = plan.price; // Updated to use 'price' instead of 'cost'
    const handlingFee = service.handlingFees;
    const totalCost = subscriptionCost;
    const individualShare = subscriptionCost / totalMembers + handlingFee;

    if (
      !subscriptionCost ||
      !handlingFee ||
      !totalCost ||
      !individualShare ||
      !admin
    ) {
      throw new Error("Calculation error: missing required fields");
    }

    const groupCode = await generateGroupCode();

    const newGroup = await GroupModel.createGroup({
      service: service._id,
      planName: plan.planName,
      groupName,
      subscriptionPlan: plan.planName,
      numberOfMembers: totalMembers,
      subscriptionCost,
      handlingFee,
      individualShare,
      totalCost,
      groupCode,
      admin,
      members: [
        {
          user: admin,
          subscriptionStatus: "inactive",
          confirmStatus: false,
        },
      ],
      existingGroup,
      activated: existingGroup,
      nextSubscriptionDate: existingGroup ? nextSubscriptionDate : undefined, // Set nextSubscriptionDate if it's an existing group
      joinRequests: [], // Initialize joinRequests as an empty array
    });

    // Create a chat room for the group
    const chatRoom = await ChatRoomModel.createChatRoom({
      groupId: newGroup._id,
      members: [admin],
    });

    return BuildHttpResponse(res, 201, "successful", newGroup);
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
    let { search, active, subscription_status } = req.query;
    const userId = req.user._id;
    const groups = await GroupModel.getGroups(
      userId,
      page,
      limit,
      search ?? "",
      active ?? null,
      subscription_status ?? null
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

    const groupDetails = await group.groupDetails(userId, service._id);
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
      "joinRequests.user",
      "username avatarUrl"
    );

    if (!group) {
      return BuildHttpResponse(res, 404, "Group not found");
    }

    if (group.admin.toString() == req.user._id.toString()) {
      return BuildHttpResponse(res, 403, "admin cannot leave group");
    }

    await group.removeMember(req.user._id);

    return BuildHttpResponse(res, 200, "successfully left group");
  } catch (error) {
    return BuildHttpResponse(res, 500, error.message);
  }
};
