const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const { getPaginatedResults } = require("../utils/pagination");
const ServiceModel = require("../models/service");
const { updateTimestampPlugin } = require("../utils/mongoose-plugins");

const paymentDeadline = 48;
const upcomingDeadline = 5 * 24;
const MemberSchema = new Schema({
  user: { type: mongoose.Types.ObjectId, ref: "User", index: true },
  subscriptionStatus: { type: String, default: "inactive" },
  confirmStatus: { type: Boolean, default: false },
  paymentActive: { type: Boolean, default: false },
  lastInvoiceSentAt: { type: Date },
  addedAt: {
    type: Date,
    default: Date.now, // Automatically set the time when a member is added
  },
});
const modelName = "Group";

const GroupSchema = new Schema(
  {
    // planName: { type: String, required: true },
    service: {
      type: mongoose.Types.ObjectId,
      required: true,
      ref: "Service",
      index: true,
    },
    groupName: { type: String, required: true },
    // subscriptionPlan: { type: String, required: true },
    numberOfMembers: { type: Number, required: true },
    subscriptionCost: { type: Number, required: true },
    handlingFee: { type: Number, required: true },
    individualShare: { type: Number, required: true },
    // totalCost: { type: Number, required: true },
    groupCode: { type: String, required: true, unique: true, index: true },
    admin: {
      type: mongoose.Types.ObjectId,
      required: true,
      ref: "User",
      index: true,
    },
    members: { type: [MemberSchema], default: [] },
    joinRequests: [
      {
        user: { type: mongoose.Types.ObjectId, ref: "User" },
        message: { type: String, required: true },
      },
    ],
    oneTimePayment: { type: Boolean, default: false },
    existingGroup: { type: Boolean, default: false },
    activated: { type: Boolean, default: false },
    nextSubscriptionDate: { type: Date },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    methods: {
      async isUserAMember(userId) {
        return this.members.some(
          (member) =>
            member.user && member.user.toString() === userId.toString()
        );
      },
      async addMember({ userId, subscriptionStatus, confirmStatus }) {
        this.members.push({
          user: userId,
          subscriptionStatus,
          confirmStatus,
          addedAt: new Date(),
        });
        await this.save();
        return this;
      },
      async removeMember(userId) {
        this.members = this.members.filter(
          (member) => member.user.toString() !== userId.toString()
        );
        await this.save();
        return this;
      },
      async updateMemberConfirmStatus(userId, confirmStatus) {
        const member = this.members.find(
          (member) => member.user.toString() === userId.toString()
        );
        if (member) {
          member.confirmStatus = confirmStatus;
          await this.save();
        }
        return this;
      },
      async updateMemberPaymentActiveState(userId, status = false) {
        const member = this.members.find(
          (member) => member.user.toString() === userId.toString()
        );
        if (member) {
          member.paymentActive = status;
          await this.save();
        }
        return this;
      },
      async updateMemberlastInvoiceSentAt(userId, dateTime = Date.now()) {
        const member = this.members.find(
          (member) => member.user.toString() === userId.toString()
        );
        if (member) {
          member.lastInvoiceSentAt = dateTime;
          await this.save();
        }
        return this;
      },
      async haveAllMembersConfirmed() {
        return this.members.every((member) => member.confirmStatus);
      },
      async isMemberConfirmed(userId) {
        const member = this.members.find(
          (member) => member.user.toString() === userId.toString()
        );
        return member ? member.confirmStatus : null;
      },
      async updateMemberSubscriptionStatus(userId, subscriptionStatus) {
        const member = this.members.find(
          (member) => member.user.toString() === userId.toString()
        );
        if (member) {
          member.subscriptionStatus = subscriptionStatus;
          await this.save();
        }
        return this;
      },
      async findMemberById(userId) {
        return this.members.find(
          (member) => member.user.toString() === userId.toString()
        );
      },
      async isAdmin(userId) {
        return this.admin.toString() == userId.toString();
      },
      async findJoinRequestIndexByUserId(userId) {
        const joinRequestIndex = this.joinRequests.findIndex(
          (req) => req.user._id.toString() === userId
        );
        return joinRequestIndex;
      },
      async addJoinRequest({ userId, message }) {
        this.joinRequests.push({ user: userId, message });
        await this.save();
        return this;
      },
      async removeJoinRequestByIndex(index) {
        this.joinRequests.splice(index, 1);
        await this.save();
        return this;
      },
      async groupDetails(userId, serviceId) {
        const isMember = await this.isUserAMember(userId);
        const service = await ServiceModel.findById(serviceId);
        const groupDetails = {
          subscriptionService: this.subscriptionService,
          serviceName: this.serviceName,
          groupName: this.groupName,
          groupCode: this.groupCode,
          // subscriptionPlan: this.subscriptionPlan,
          numberOfMembers: this.numberOfMembers,
          subscriptionCost: this.subscriptionCost,
          handlingFee: this.handlingFee,
          individualShare: this.individualShare,
          // totalCost: this.totalCost,
          admin: {
            _id: this.admin._id,
            username: this.admin.username,
            avatarUrl: this.admin.avatarUrl,
          },
          memberCount: this.members.length,
          createdAt: this.createdAt,
          // serviceLogo: service.logoUrl,
          // serviceDescription:
          //   service.subscriptionPlans.find(
          //     (plan) => plan.planName === this.planName
          //   )?.description || [],
          oneTimePayment: { type: Boolean, default: false },
          existingGroup: this.existingGroup,
          activated: this.activated,
          nextSubscriptionDate: this.nextSubscriptionDate, // Include nextSubscriptionDate in response
          joinRequestCount: this.joinRequests.length, // Number of join requests
        };

        if (isMember) {
          groupDetails.members = this.members.map((member) => ({
            user: {
              _id: member.user._id,
              username: member.user.username,
              avatarUrl: member.user.avatarUrl,
            },
            subscriptionStatus: member.subscriptionStatus,
            confirmStatus: member.confirmStatus,
          }));
          groupDetails.groupCode = this.groupCode;
          groupDetails.joinRequests =
            this.admin._id.toString() === userId.toString()
              ? this.joinRequests
              : [];
        } else {
          groupDetails.members = this.members.map((member) => ({
            user: {
              _id: member.user._id,
              username: member.user.username,
              avatarUrl: member.user.avatarUrl,
            },
          }));
        }
        return groupDetails;
      },
      async removeInactiveMembers() {
        const now = new Date();
        const deadline = new Date(
          now.getTime() - paymentDeadline * 60 * 60 * 1000
        );

        this.members = this.members.filter(
          (member) =>
            !(
              member.paymentActive === false &&
              member.lastInvoiceSentAt &&
              member.lastInvoiceSentAt < deadline &&
              !member.user.equals(this.admin)
            )
        );
        await this.save();
        return this;
      },
      async findInactiveMembers() {
        const now = new Date();
        const deadline = new Date(
          now.getTime() - paymentDeadline * 60 * 60 * 1000
        );

        const inactivemembers = this.members.filter(
          (member) =>
            member.paymentActive === false &&
            member.lastInvoiceSentAt &&
            member.lastInvoiceSentAt < deadline &&
            !member.user.equals(this.admin)
        );
        return inactivemembers;
      },
    },
    statics: {
      async findbyGroupCode(groupCode) {
        return await this.findOne({ groupCode });
      },
      async createGroup({
        service,
        // planName,
        groupName,
        // subscriptionPlan,
        numberOfMembers,
        subscriptionCost,
        handlingFee,
        individualShare,
        // totalCost,
        groupCode,
        admin,
        members,
        oneTimePayment,
        existingGroup,
        activated,
        nextSubscriptionDate,
        joinRequests = [], // Initialize joinRequests as an empty array
      }) {
        const model = mongoose.model(modelName);
        const newGroup = new model({
          service,
          // planName,
          groupName,
          // subscriptionPlan,
          numberOfMembers,
          subscriptionCost,
          handlingFee,
          individualShare,
          // totalCost,
          groupCode,
          admin,
          members,
          oneTimePayment,
          existingGroup,
          activated,
          nextSubscriptionDate,
          joinRequests,
        });

        await newGroup.save();
        return newGroup;
      },
      async getGroupsByServiceId(userId, serviceId, page = 1, limit = 10) {
        const model = mongoose.model(modelName);
        let query = {
          $or: [{ "members.user": userId }, { admin: userId }],
          service: serviceId,
        };
        const result = await getPaginatedResults(model, page, limit, query);
        return result;
      },
      async getGroups(
        userId,
        page = 1,
        limit = 10,
        search = "",
        active = null,
        subscriptionStatus = null,
        oneTimePayment = null
      ) {
        const model = mongoose.model(modelName);

        let query = {
          $or: [{ "members.user": userId }, { admin: userId }],
        };

        if (active) {
          query.activated = active;
        }
        if (oneTimePayment !== null) {
          query.oneTimePayment = oneTimePayment;
        }
        // Add search filter to the query if it exists
        if (search) {
          query.$or = [
            // { planName: new RegExp(search, "i") }, // case-insensitive regex match
            { groupName: new RegExp(search, "i") }, // case-insensitive regex match
          ];
        }

        if (subscriptionStatus) {
          query["members"] = {
            $elemMatch: { user: userId, subscriptionStatus },
          };
        }

        // Determine the sorting order based on the user role
        let sortOption = { updatedAt: -1 };
        // const isAdmin = await model.exists({ admin: userId });
        // if (isAdmin) {
        //   // Sort by group creation date (newest first) if the user is the admin
        //   sortOption["createdAt"] = -1;
        // }
        // Sort by when the user was added to the group if they are a member
        const memberSort = { "members.addedAt": -1 };

        const options = {
          populate: [
            {
              path: "admin",
              select: "username avatarUrl",
            },
            {
              path: "service",
              select: "serviceName logoUrl",
            },
          ],
          sort: {
            ...sortOption,
            ...memberSort,
          },
        };

        const result = await getPaginatedResults(
          model,
          page,
          limit,
          query,
          {},
          options
        );
        return result;
      },
      async updateMemberConfirmStatus(groupId, userId, confirmStatus) {
        const model = mongoose.model(modelName);
        return await model.updateOne(
          { _id: groupId, "members.user": userId },
          { $set: { "members.$.confirmStatus": confirmStatus } }
        );
      },
      async findGroupsWithInvoiceSentExactly24HrsAgo() {
        const now = new Date();
        const lowerBound = new Date(
          now.getTime() - 24 * 60 * 60 * 1000 - 2 * 60 * 1000
        ); // 24 hours ago - 2 minutes
        const upperBound = new Date(
          now.getTime() - 24 * 60 * 60 * 1000 + 2 * 60 * 1000
        ); // 24 hours ago + 2 minutes

        return await this.find({
          members: {
            $elemMatch: {
              paymentActive: false,
              lastInvoiceSentAt: { $gte: lowerBound, $lte: upperBound },
              user: { $ne: this.admin },
            },
          },
        })
          .populate({
            path: "members.user",
            select: "username email deviceToken",
          })
          .populate("admin", "username email deviceToken");
      },
      async findGroupsWithInactiveMembers(
        deadlineInHrs = paymentDeadline,
        limit = 1000
      ) {
        const now = new Date();
        const deadline = new Date(
          now.getTime() - deadlineInHrs * 60 * 60 * 1000
        );

        return await this.find({
          members: {
            $elemMatch: {
              paymentActive: false,
              lastInvoiceSentAt: { $lt: deadline },
              user: { $ne: this.admin },
            },
          },
        })
          .limit(limit)
          .populate({
            path: "members.user",
            select: "username email deviceToken",
          })
          .populate("admin", "username email deviceToken");
      },
      async removeInactiveMembers() {
        const oneDayAgo = new Date(
          Date.now() - paymentDeadline * 60 * 60 * 1000
        );
        return this.updateMany(
          {},
          {
            $pull: {
              members: {
                $and: [
                  { paymentActive: false },
                  { lastInvoiceSentAt: { $lte: oneDayAgo } },
                  { $expr: { $ne: ["$user", "$$CURRENT.admin"] } },
                ],
              },
            },
          }
        );
      },
      async findGroupsWithUpcomingSubscriptionDates(limit = 1000) {
        const now = new Date();
        const upcomingDate = new Date(
          now.getTime() + upcomingDeadline * 60 * 60 * 1000
        );

        return await this.find({
          nextSubscriptionDate: { $lte: upcomingDate },
        })
          .limit(limit)
          .populate("admin", "username email")
          .populate({
            path: "members.user",
            select: "username email",
          });
      },
      async findActivatedGroupsWithValidMembersAndPayments(limit = 400) {
        return await this.aggregate([
          // Match groups where activated is true
          {
            $match: {
              activated: true,
            },
          },
          // Lookup payments for these groups
          {
            $lookup: {
              from: "payments", // The name of the Payments collection
              localField: "_id",
              foreignField: "group",
              as: "payments",
            },
          },
          // Filter payments where disbursed=false and status=successful
          {
            $addFields: {
              payments: {
                $filter: {
                  input: "$payments",
                  as: "payment",
                  cond: {
                    $and: [
                      { $eq: ["$$payment.disbursed", "not-disbursed"] },
                      { $eq: ["$$payment.status", "successful"] },
                    ],
                  },
                },
              },
            },
          },
          // Match groups where all members have confirmStatus and paymentActive as true
          {
            $addFields: {
              allMembersValid: {
                $allElementsTrue: [
                  {
                    $map: {
                      input: "$members",
                      as: "member",
                      in: {
                        $and: [
                          { $eq: ["$$member.confirmStatus", true] },
                          { $eq: ["$$member.paymentActive", true] },
                        ],
                      },
                    },
                  },
                ],
              },
            },
          },
          {
            $match: {
              allMembersValid: true,
            },
          },
          // Optionally project fields if needed
          {
            $project: {
              groupName: 1,
              // planName: 1,
              members: 1,
              payments: 1,
              "admin.email": 1,
            },
          },
          {
            $limit: limit,
          },
        ]);
      },
    },
  }
);
GroupSchema.index({
  "members.lastInvoiceSentAt": 1,
  "members.paymentActive": 1,
});

GroupSchema.plugin(updateTimestampPlugin);
const Group = mongoose.model(modelName, GroupSchema);

module.exports = Group;
