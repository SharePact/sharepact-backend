const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const { getPaginatedResults } = require("../utils/pagination");
const ServiceModel = require("../models/service");

const MemberSchema = new Schema({
  user: { type: mongoose.Types.ObjectId, ref: "User", index: true },
  subscriptionStatus: { type: String, default: "inactive" },
  confirmStatus: { type: Boolean, default: false },
});
const modelName = "Group";

const GroupSchema = new Schema(
  {
    planName: { type: String, required: true },
    service: {
      type: mongoose.Types.ObjectId,
      required: true,
      ref: "Service",
      index: true,
    },
    groupName: { type: String, required: true },
    subscriptionPlan: { type: String, required: true },
    numberOfMembers: { type: Number, required: true },
    subscriptionCost: { type: Number, required: true },
    handlingFee: { type: Number, required: true },
    individualShare: { type: Number, required: true },
    totalCost: { type: Number, required: true },
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
          subscriptionPlan: this.subscriptionPlan,
          numberOfMembers: this.numberOfMembers,
          subscriptionCost: this.subscriptionCost,
          handlingFee: this.handlingFee,
          individualShare: this.individualShare,
          totalCost: this.totalCost,
          admin: {
            _id: this.admin._id,
            username: this.admin.username,
            avatarUrl: this.admin.avatarUrl,
          },
          memberCount: this.members.length,
          createdAt: this.createdAt,
          serviceLogo: service.logoUrl,
          serviceDescription:
            service.subscriptionPlans.find(
              (plan) => plan.planName === this.planName
            )?.description || [],
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
    },
    statics: {
      async findbyGroupCode(groupCode) {
        return await this.findOne({ groupCode });
      },
      async createGroup({
        service,
        planName,
        groupName,
        subscriptionPlan,
        numberOfMembers,
        subscriptionCost,
        handlingFee,
        individualShare,
        totalCost,
        groupCode,
        admin,
        members,
        existingGroup,
        activated,
        nextSubscriptionDate,
        joinRequests = [], // Initialize joinRequests as an empty array
      }) {
        const model = mongoose.model(modelName);
        const newGroup = new model({
          service,
          planName,
          groupName,
          subscriptionPlan,
          numberOfMembers,
          subscriptionCost,
          handlingFee,
          individualShare,
          totalCost,
          groupCode,
          admin,
          members,
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
        subscriptionStatus = null
      ) {
        const model = mongoose.model(modelName);

        let query = {
          $or: [{ "members.user": userId }, { admin: userId }],
        };

        if (active) {
          query.activated = active;
        }

        // Add search filter to the query if it exists
        if (search) {
          query.$or = [
            { planName: new RegExp(search, "i") }, // case-insensitive regex match
            { groupName: new RegExp(search, "i") }, // case-insensitive regex match
          ];
        }

        if (subscriptionStatus) {
          query["members"] = {
            $elemMatch: { user: userId, subscriptionStatus },
          };
        }

        const result = await getPaginatedResults(model, page, limit, query);
        return result;
      },
    },
  }
);
const Group = mongoose.model(modelName, GroupSchema);

module.exports = Group;
