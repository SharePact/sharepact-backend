const { string, number, array, z, boolean } = require('zod');

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

exports.processJoinRequestSchema = z.object({
    action: z.enum(["accept", "reject"], { required_error: "accept or reject this request" })
})

exports.editGroupSchema = z.object({
    username: string().optional(),
    password: string().optional(),
    groupName: string().optional(),
    activated: boolean().default(false)
})