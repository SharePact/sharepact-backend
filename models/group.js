const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const { getPaginatedResults } = require("../utils/pagination");

const MemberSchema = new Schema({
  user: { type: mongoose.Types.ObjectId, ref: "User" },
  subscriptionStatus: { type: String, default: "inactive" },
  confirmStatus: { type: Boolean, default: false },
});
const modelName = "Group";

const GroupSchema = new Schema(
  {
    planName: { type: String, required: true },
    service: { type: mongoose.Types.ObjectId, required: true, ref: "Service" },
    groupName: { type: String, required: true },
    subscriptionPlan: { type: String, required: true },
    numberOfMembers: { type: Number, required: true },
    subscriptionCost: { type: Number, required: true },
    handlingFee: { type: Number, required: true },
    individualShare: { type: Number, required: true },
    totalCost: { type: Number, required: true },
    groupCode: { type: String, required: true, unique: true },
    admin: { type: mongoose.Types.ObjectId, required: true, ref: "User" },
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
      async getGroupsByServiceId(serviceId, page = 1, limit = 10) {
        const model = mongoose.model(modelName);
        const result = await getPaginatedResults(model, page, limit, {
          service: serviceId,
        });
        return result;
      },
      async getGroups(page = 1, limit = 10) {
        const model = mongoose.model(modelName);
        const result = await getPaginatedResults(model, page, limit);
        return result;
      },
    },
  }
);
const Group = mongoose.model(modelName, GroupSchema);

module.exports = Group;
