const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const MemberSchema = new Schema({
    user: { type: mongoose.Types.ObjectId, ref: 'User' },
    subscriptionStatus: { type: String, default: 'inactive' },
    confirmStatus: { type: Boolean, default: false }
});

const GroupSchema = new Schema({
    subscriptionService: { type: String, required: true },
    serviceName: { type: String, required: true },
    groupName: { type: String, required: true },
    subscriptionPlan: { type: String, required: true },
    numberOfMembers: { type: Number, required: true },
    subscriptionCost: { type: Number, required: true },
    handlingFee: { type: Number, required: true },
    individualShare: { type: Number, required: true },
    totalCost: { type: Number, required: true },
    groupCode: { type: String, required: true, unique: true },
    admin: { type: mongoose.Types.ObjectId, required: true, ref: 'User' },
    members: { type: [MemberSchema], default: [] },
    joinRequests: [{
        user: { type: mongoose.Types.ObjectId, ref: 'User' },
        message: { type: String, required: true }
    }],
    existingGroup: { type: Boolean, default: false },
    activated: { type: Boolean, default: false },
    nextSubscriptionDate: { type: Date },
    createdAt: { type: Date, default: Date.now }
});

const Group = mongoose.model('Group', GroupSchema);

module.exports = Group;
