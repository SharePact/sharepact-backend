const { Schema, model, Types } = require('mongoose');

// exports.UserModelSchema = new Schema({
//     email: { type: String, unique: true, required: true },
//     verified: { type: Boolean, default: false },
//     username: { type: String, unique: true, required: true },
//     role: { type: String, default: "user" },
//     uid: { type: String, required: true }
// })

// exports.UserModel = model('User', this.UserModelSchema)

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
    members: { type: [Types.ObjectId], ref: "User", default: [] },
    activated: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
})

exports.GroupModel = model('Group', this.GroupModelSchema);


exports.JoinRequestModelSchema = new Schema({
    group: { type: Types.ObjectId, required: true, ref: "Group" },
    // serviceId: { type: String, required: true },
    user: { type: Types.ObjectId, required: true, ref: "User" },
    message: { type: String, default: "" },
    status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" }
})

exports.GroupJoinRequestModel = model('GroupJoinRequest', this.JoinRequestModelSchema);

exports.GroupMembershipModelSchema = new Schema({
    group: { type: Types.ObjectId, required: true, ref: "Group" },
    user: { type: Types.ObjectId, required: true, ref: "User" },
    serviceId: { type: String, required: true },
    active: { type: Boolean, default: false },
    passwordViews: { type: Number, default: 2 },
    confirmedAccess: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
})

exports.GroupMembershipModel = model('GroupMembership', this.GroupMembershipModelSchema)

exports.GroupPaymentSchema = new Schema({
    member: { type: Types.ObjectId, required: true, ref: "GroupMembership" },
    user: { type: Types.ObjectId, required: true, ref: "User" },
    amount: { type: Number, required: true },
    paid: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
})

exports.GroupPaymentModel = model("GroupPayment", this.GroupPaymentSchema)


exports.MessageSchema = new Schema({
    text: { type: String, required: true },
    group: { type: Types.ObjectId, required: true, ref: "Group" },
    user: { type: Types.ObjectId, required: true, ref: "User" },
    eventMessage: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
})

exports.MessageModel = model("Message", this.MessageSchema);