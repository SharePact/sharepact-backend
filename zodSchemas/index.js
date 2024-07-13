const { string, number, array, z, boolean } = require('zod');
const service = require('../models/service');

exports.createUserSchema = z.object({
    email: string({ required_error: "email is required" }).email(),
    password: string({ required_error: "password is required" }).min(6),
}).strict();

exports.createGroupSchema = z.object({
    subscriptionService: string({ required_error: "subscription services is required" }),
    groupName: string({ required_error: "group name is required" }),
    subscriptionPlan: string({ required_error: "subscription plan is required" }),
    numberOfMembers: number({ required_error: "number of members is required" }),
    accessType: z.enum(["login", "invite"], { required_error: "provide a valid access type" }),
    username: string().optional(),
    password: string().optional(),
}).strict();

exports.subscriptionPlanSchema = z.object({
    plan: string({ required_error: "plan is required" }),
    price: number({ required_error: "price is required" }),
}).strict();

exports.createServiceSchema = z.object({
    serviceName: string({ required_error: "service name is required" }),
    serviceDescription: string({ required_error: "service description is required" }),
    subscriptionPlans: array(this.subscriptionPlanSchema,
        { required_error: "subscription plans is required" }).min(1),
    currency: string({ required_error: "currency is required" }),
    handlingFees: number({ required_error: "handling fees is required" }),
    categoryId: string({ required_error: "category id is required" }),
}).strict();

exports.sendJoinRequestSchema = z.object({
    groupCode: string({ required_error: "group id is required" }),
    serviceId: string({ required_error: "service is required" }),
    message: string().optional(),
}).strict();

exports.processJoinRequestSchema = z.object({
    action: z.enum(["accept", "reject"], { required_error: "accept or reject this request" })
})

exports.editGroupSchema = z.object({
    activated: boolean().default(false)
})


exports.confirmMemberReadySchema = z.object({
    ready: boolean().default(false)
})