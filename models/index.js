const { Schema, model, Types } = require('mongoose');

exports.UserModelSchema = new Schema({
    email: { type: String, unique: true, required: true },
    verified: { type: Boolean, default: false },
    username: { type: String, unique: true, required: true },
    role: { type: String, default: "user" },
    uid: { type: String, required: true }
})

exports.UserModel = model('User', this.UserModelSchema)

exports.GroupModelSchema = new Schema({
    subscriptionService: { type: String, required: true },
    serviceName: { type: String, required: true },
    groupName: { type: String, required: true },
    subscriptionPlan: { type: String, required: true },
    numberOfMembers: { type: Number, required: true },
    subscriptionCost: { type: Number, required: true },
    handlingFee: { type: Number, required: true },
    individualShare: { type: Number, required: true },
    totalCost: { type: Number, required: true },
    accessType: { type: String, required: true, enum: ["login", "invite"] },
    groupCode: { type: String, required: true, unique: true },
    username: { type: String, required: false },
    password: { type: String, required: false },
    admin: { type: Types.ObjectId, required: true, ref: "User" },
    createdAt: { type: Date, default: Date.now }
})

exports.GroupModel = model('Group', this.GroupModelSchema);


exports.JoinRequestModelSchema = new Schema({
    group: { type: Types.ObjectId, required: true, ref: "Group" },
    user: { type: Types.ObjectId, required: true, ref: "User" },
    status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" }
})

exports.GroupJoinRequestModel = model('GroupJoinRequest', this.JoinRequestModelSchema)