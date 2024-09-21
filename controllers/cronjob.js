const GroupModel = require("../models/group");
const NotificationService = require("../notification/index");
const { BuildHttpResponse } = require("../utils/response");
const PaymentInvoiceService = require("../notification/payment_invoice");
const Flutterwave = require("../utils/flutterwave");
const BankDetails = require("../models/bankdetails");
const PaymentModel = require("../models/payment");
const { v4: uuidv4 } = require("uuid");
const inAppNotificationService = require("../notification/inapp");
const mongoose = require("mongoose");

let pMap;
(async () => {
  pMap = (await import("p-map")).default;
})();

const sendInAppNotification = async (notificationData) => {
  if (notificationData.deviceToken) {
    await inAppNotificationService.sendNotification({
      medium: "token",
      topicTokenOrGroupId: notificationData.deviceToken,
      name: notificationData.name,
      userId: notificationData.userId,
      groupId: notificationData.groupId,
      memberId: notificationData.memberId,
    });
  }
};

const sendNotifications = async (
  userId,
  email,
  textContent,
  notificationType,
  groupData
) => {
  await NotificationService.sendNotification({
    type: notificationType,
    userId,
    to: [email],
    textContent,
    username: groupData.username,
    groupName: groupData.groupName,
    content: groupData.content || "",
  });

  await sendInAppNotification(groupData);
};

exports.recurringInvoices = async (req, res) => {
  try {
    const groups = await GroupModel.findGroupsWithUpcomingSubscriptionDates();

    await pMap(
      groups,
      async (group) => {
        group.activated = true;
        group.nextSubscriptionDate = new Date(
          group.nextSubscriptionDate.getTime() + 30 * 24 * 60 * 60 * 1000
        );
        await PaymentInvoiceService.sendToGroup({ group });
        await group.save();
      },
      { concurrency: 100 }
    );
    return BuildHttpResponse(res, 200, "success");
  } catch (error) {
    console.error("Error in recurringInvoices:", error);
    return BuildHttpResponse(res, 500, error.message);
  }
};

exports.checkMembersPayments = async (req, res) => {
  try {
    const groups = await GroupModel.findGroupsWithInactiveMembers();

    await pMap(
      groups,
      async (group) => {
        const inactiveMembers = await group.findInactiveMembers();

        await pMap(
          inactiveMembers,
          async (inactiveMember) => {
            await group.removeMember(inactiveMember.user._id);
            await sendNotifications(
              inactiveMember.user._id,
              inactiveMember.user.email,
              `You have been removed from ${group.groupName}`,
              "removalFromSubscriptionGroup",
              {
                username: inactiveMember.username,
                groupName: group.groupName,
                deviceToken: inactiveMember.user.deviceToken,
                userId: inactiveMember.user._id,
                groupId: group._id,
              }
            );

            await sendNotifications(
              group.admin._id,
              group.admin.email,
              `Your member ${inactiveMember.username} has been removed from ${group.groupName}`,
              "memberRemovalUpdateForCreator",
              {
                username: group.admin.username,
                groupName: group.groupName,
                deviceToken: group.admin.deviceToken,
                userId: group.admin._id,
                groupId: group._id,
                memberId: inactiveMember.user._id,
              }
            );
          },
          { concurrency: 50 }
        );
      },
      { concurrency: 100 }
    );
    return BuildHttpResponse(res, 200, "success");
  } catch (error) {
    console.error("Error in checkMembersPayments:", error);
    return BuildHttpResponse(res, 500, error.message);
  }
};

exports.paymentReminderForInactiveMembers = async (req, res) => {
  try {
    const groups = await GroupModel.findGroupsWithInvoiceSentExactly24HrsAgo();

    await pMap(
      groups,
      async (group) => {
        const inactiveMembers =
          await group.findMembersWithPendingPaymentAfter24hrs();

        await pMap(
          inactiveMembers,
          async (inactiveMember) => {
            await sendNotifications(
              inactiveMember.user._id,
              inactiveMember.user.email,
              `Your subscription payment deadline is in 24hrs`,
              "paymentReminder",
              {
                username: inactiveMember.user.username,
                groupName: group.groupName,
                deviceToken: inactiveMember.user.deviceToken,
                userId: inactiveMember.user._id,
                groupId: group._id,
              }
            );

            await sendNotifications(
              group.admin._id,
              group.admin.email,
              `Your member ${inactiveMember.username} from ${group.groupName} has their subscription payment deadline in 24hrs`,
              "memberPaymentReminderForCreator",
              {
                username: group.admin.username,
                groupName: group.groupName,
                deviceToken: group.admin.deviceToken,
                userId: group.admin._id,
                groupId: group._id,
                memberId: inactiveMember.user._id,
              }
            );
          },
          { concurrency: 50 }
        );
      },
      { concurrency: 100 }
    );
    return BuildHttpResponse(res, 200, "success");
  } catch (error) {
    console.error("Error in paymentReminderForInactiveMembers:", error);
    return BuildHttpResponse(res, 500, error.message);
  }
};

exports.groupCreatorDisbursement = async (req, res) => {
  try {
    const groups =
      await GroupModel.findActivatedGroupsWithValidMembersAndPayments();

    await pMap(
      groups,
      async (group) => {
        const bankDetails = await BankDetails.getByUserId(group.admin._id);
        if (!bankDetails) return console.log(`No bank details found`);

        const payments = group.payments;
        if (!payments.length) return;

        const totalAmount = payments.reduce(
          (sum, payment) => sum + payment.amount,
          0
        );

        const dResponse = await Flutterwave.initTransfer({
          groupCreatorId: group.admin._id,
          bankCode: bankDetails.sortCode,
          accountNumber: bankDetails.accountNumber,
          amount: totalAmount,
          currency: payments[0]?.currency,
          reference: `${uuidv4()}_PMCKDU_1`,
          narration: `Disbursement for subscription from group ${group.groupName}`,
        });

        if (dResponse?.status) {
          await pMap(
            payments,
            async (payment) => {
              await PaymentModel.findByIdAndUpdate(payment._id, {
                disbursementId: dResponse.id,
                disbursed: "pending",
              });
            },
            { concurrency: 10 }
          );
        }
      },
      { concurrency: 50 }
    );
    return BuildHttpResponse(res, 200, "success");
  } catch (error) {
    console.error("Error in groupCreatorDisbursement:", error);
    return BuildHttpResponse(res, 500, error.message);
  }
};

exports.verifyPendingDisbursements = async (req, res) => {
  try {
    const disbursements =
      await PaymentModel.getPaymentsGroupedByDisbursementId();

    await pMap(
      disbursements,
      async (disbursement) => {
        const dResponse = await Flutterwave.fetchTransfer(disbursement._id);

        if (dResponse?.status) {
          await pMap(
            disbursement.payments,
            async (payment) => {
              await PaymentModel.findByIdAndUpdate(payment._id, {
                disbursed: "successful",
              });
            },
            { concurrency: 10 }
          );
        } else if (dResponse?.statusString?.toLowerCase() === "failed") {
          await pMap(
            disbursement.payments,
            async (payment) => {
              await PaymentModel.findByIdAndUpdate(payment._id, {
                disbursed: "not-disbursed",
              });
            },
            { concurrency: 10 }
          );
        }
      },
      { concurrency: 50 }
    );
    return BuildHttpResponse(res, 200, "success");
  } catch (error) {
    console.error("Error in verifyPendingDisbursements:", error);
    return BuildHttpResponse(res, 500, error.message);
  }
};
