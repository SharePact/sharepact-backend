const { string, number, array, z, boolean } = require("zod");

exports.createUserSchema = z
  .object({
    email: string({ required_error: "email is required" }).email(),
    password: string({ required_error: "password is required" }).min(6),
  })
  .strict();

exports.createGroupSchema = z
  .object({
    serviceId: string({
      required_error: "service id is required",
    }),
    groupName: string({ required_error: "group name is required" }),
    subscriptionCost: number({ required_error: "subscription cost is required" }),

    // subscriptionPlan: string({
    //   required_error: "subscription plan is required",
    // }),
    numberOfMembers: number({
      required_error: "number of members is required",
    }),
    existingGroup: boolean().optional(),
    oneTimePayment: boolean().optional(),
    nextSubscriptionDate: string().optional(),
  })
  .strict();

// exports.subscriptionPlanSchema = z
//   .object({
//     plan: string({ required_error: "plan is required" }),
//     price: number({ required_error: "price is required" }),
//   })
//   .strict();

exports.createServiceSchema = z
  .object({
    serviceName: string({ required_error: "service name is required" }),
    serviceDescription: string({
      required_error: "service description is required",
    }),
    // subscriptionPlans: array(this.subscriptionPlanSchema, {
    //   required_error: "subscription plans is required",
    // }).min(1),
    currency: string({ required_error: "currency is required" }),
    handlingFees: number({ required_error: "handling fees is required" }),
    categoryId: string({ required_error: "category id is required" }),
  })
  .strict();

exports.sendJoinRequestSchema = z
  .object({
    groupCode: string({ required_error: "group id is required" }),
    // serviceId: string({ required_error: "service is required" }),
    message: string({ required_error: "group id is required" }),
  })
  .strict();

exports.addBankDetailsSchema = z
  .object({
    accountName: string({ required_error: "account name is required" }),
    bankName: string({ required_error: "bank name is required" }),
    accountNumber: string({ required_error: "account number is required" }),
    sortCode: string({ required_error: "bank sort code is required" }),
  })
  .strict();

exports.updateBankDetailsSchema = z
  .object({
    accountName: string().optional(),
    bankName: string().optional(),
    accountNumber: string().optional(),
    sortCode: string().optional(),
  })
  .strict();

exports.markMessagesAsReadSchema = z
  .object({
    groupId: string().optional(),
    messageIds: array(string().optional()).optional(),
  })
  .strict();

exports.contactSupportSchema = z
  .object({
    name: string().optional(),
    email: string({ required_error: "email is required" }),
    message: string({ required_error: "message is required" }),
  })
  .strict();

exports.updateNotificationConfigSchema = z
  .object({
    loginAlert: boolean().optional(),
    passwordChanges: boolean().optional(),
    newGroupCreation: boolean().optional(),
    groupInvitation: boolean().optional(),
    groupMessages: boolean().optional(),
    subscriptionUpdates: boolean().optional(),
    paymentReminders: boolean().optional(),
    renewalAlerts: boolean().optional(),
  })
  .strict();
