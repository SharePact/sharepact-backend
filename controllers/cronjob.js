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
const User = require("../models/user");

let pMap;
(async () => {
  pMap = (await import("p-map")).default;
  // Your code here
})();

exports.recurringInvoices = async (req, res) => {
  try {
    const groups = await GroupModel.findGroupsWithUpcomingSubscriptionDates();

    await pMap(
      groups,
      async (group) => {
        group.activated = true;
        await PaymentInvoiceService.sendToGroup({ group });
        group.nextSubscriptionDate = new Date(
          new Date(group.nextSubscriptionDate).getTime() +
            30 * 24 * 60 * 60 * 1000
        );
        await group.save();
      },
      { concurrency: 100 }
    );
    return BuildHttpResponse(res, 200, "success");
  } catch (error) {
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
        for (const inactiveMember of inactiveMembers) {
          await group.removeMember(inactiveMember.user._id);
          await NotificationService.sendNotification({
            type: "removalFromSubscriptionGroup",
            userId: inactiveMember.user._id,
            to: [inactiveMember.user.email],
            textContent: `You have been removed from ${group.groupName}`,
            username: inactiveMember.username,
            groupName: group.groupName,
          });
          if (inactiveMember?.user?.deviceToken) {
            await inAppNotificationService.sendNotification({
              medium: "token",
              topicTokenOrGroupId: inactiveMember?.user?.deviceToken,
              name: "removalFromSubscriptionGroup",
              userId: inactiveMember?.user?._id,
              groupId: group._id,
            });
          }

          await NotificationService.sendNotification({
            type: "memberRemovalUpdateForCreator",
            userId: group.admin._id,
            to: [group.admin.email],
            textContent: `Your member ${inactiveMember.username} has been removed from ${group.groupName}`,
            username: group.admin.username,
            groupName: group.groupName,
            content: `Your member ${inactiveMember.username} has been removed from ${group.groupName}`,
          });
          if (group?.admin?.deviceToken) {
            await inAppNotificationService.sendNotification({
              medium: "token",
              topicTokenOrGroupId: group?.admin?.deviceToken,
              name: "memberRemovalUpdateForCreator",
              userId: group.admin._id,
              groupId: group._id,
              memberId: inactiveMember?.user?._id,
            });
          }
        }
      },
      { concurrency: 100 }
    );
    return BuildHttpResponse(res, 200, "success");
  } catch (error) {
    return BuildHttpResponse(res, 500, error.message);
  }
};
exports.paymentReminderForInactiveMembers = async (req, res) => {
  try {
    const groups = await GroupModel.findGroupsWithInvoiceSentExactly24HrsAgo();
    console.log("groups found", groups?.length);
    await pMap(
      groups,
      async (group) => {
        const inactiveMembers =
          await group.findMembersWithPendingPaymentAfter24hrs();

        for (const inactiveMember of inactiveMembers) {
          await NotificationService.sendNotification({
            type: "paymentReminder",
            userId: inactiveMember.user._id,
            to: [inactiveMember.user.email],
            textContent: `Your subscription payment deadline is in 24hrs`,
            username: inactiveMember.user.username,
            groupName: group.groupName,
          });
          if (inactiveMember?.user?.deviceToken) {
            await inAppNotificationService.sendNotification({
              medium: "token",
              topicTokenOrGroupId: inactiveMember?.user?.deviceToken,
              name: "paymentReminder",
              userId: inactiveMember?.user?._id,
              groupId: group._id,
            });
          }
          await NotificationService.sendNotification({
            type: "memberPaymentReminderForCreator",
            userId: group.admin._id,
            to: [group.admin.email],
            textContent: `Your member ${inactiveMember.username} from ${group.groupName} has their subscription payment deadline in 24hrs`,
            username: group.admin.username,
            groupName: group.groupName,
            memberUsername: inactiveMember.username,
          });
          if (group?.admin?.deviceToken) {
            await inAppNotificationService.sendNotification({
              medium: "token",
              topicTokenOrGroupId: group?.admin?.deviceToken,
              name: "memberPaymentReminderForCreator",
              userId: group.admin._id,
              groupId: group._id,
              memberId: inactiveMember?.user?._id,
            });
          }
        }
      },
      { concurrency: 100 }
    );
    return BuildHttpResponse(res, 200, "success");
  } catch (error) {
    return BuildHttpResponse(res, 500, error.message);
  }
};

exports.groupCreatorDisbursement = async (req, res) => {
  try {
    const groups =
      await GroupModel.findActivatedGroupsWithValidMembersAndPayments();
    console.log(`group for disbursement count ${groups.length}`);

    groups.map(async (group) => {
      const admin = await User.findById(group.admin._id);
      const bankDetails = await BankDetails.getByUserId(group.admin._id);
      if (!bankDetails) {
        console.log(`disbursement failed because of missing bank details`);
        await NotificationService.sendNotification({
          type: "noBankDetails",
          userId: admin._id,
          to: [admin.email],
          textContent: `Missing bank details for ${group.groupName}`,
          username: admin.username,
        });
        if (admin?.deviceToken) {
          await inAppNotificationService.sendNotification({
            medium: "token",
            topicTokenOrGroupId: admin?.deviceToken,
            name: "missingBankDetails",
            userId: admin._id,
            groupId: group._id,
            memberId: inactiveMember?.user?._id,
          });
        }
        return;
      }

      console.log(`Bank details found`);

      const payments = group.payments;
      if (payments?.length <= 0) return;

      let totalAmout = 0;
      for (const payment of payments) {
        totalAmout += payment.amount - payment.fee;
      }

      console.log(`Initiating Transfer`);
      const dResponse = await Flutterwave.initTransfer({
        groupCreatorId: group.admin._id,
        bankCode: bankDetails.sortCode,
        accountNumber: bankDetails.accountNumber,
        amount: totalAmout,
        currency: payments[0]?.currency,
        reference: uuidv4() + "_PMCKDU_1",
        narration: `disbursement for subscription from group ${group.groupName}`,
      });

      console.log(`Initiating Transfer completed`, dResponse);
      if (dResponse?.status == true) {
        console.log(`updating payments`);
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
    });

    return BuildHttpResponse(res, 200, "success");
  } catch (error) {
    return BuildHttpResponse(res, 500, error.message);
  }
};

exports.verifyPendingDisbursements = async (req, res) => {
  try {
    const disbursements =
      await PaymentModel.getPaymentsGroupedByDisbursementId();

    console.log(`Pending Disbursements found ${disbursements.length}`);

    disbursements.map(async (disbursement) => {
      const disbursementId = disbursement._id;
      console.log(`fetching Transfer`);
      const dResponse = await Flutterwave.fetchTransfer(disbursementId);
      console.log(
        `fetching Transfer completed ${dResponse?.status}, ${dResponse?.message}`
      );
      const payments = disbursement?.payments;
      let onePaymentId = null;
      let totalAmount = 0;
      if (dResponse.status == true) {
        await pMap(
          payments,
          async (payment) => {
            totalAmount += payment.amount - payment.fee;
            await PaymentModel.findByIdAndUpdate(payment._id, {
              disbursed: "successful",
            });

            if (!onePaymentId && payment?._id) {
              onePaymentId = payment._id;
            }
          },
          { concurrency: 10 }
        );

        if (onePaymentId) {
          const onePayment = await PaymentModel.findById(onePaymentId);
          const group = await GroupModel.findById(
            onePayment?.group?._id
          ).populate("admin", "username avatarUrl email deviceToken");
          const admin = group.admin;
          await NotificationService.sendNotification({
            type: "disbursmentSuccessful",
            userId: admin._id,
            to: [admin.email],
            textContent: `Disbursement Processed for ${group.groupName}`,
            username: admin.username,
            currency: onePayment.currency,
            amount: totalAmount,
            groupName: group.groupName,
          });

          if (admin?.deviceToken) {
            await inAppNotificationService.sendNotification({
              medium: "token",
              topicTokenOrGroupId: admin?.deviceToken,
              name: "disbursementSuccessful",
              userId: admin._id,
              groupId: group._id,
            });
          }
        }
      } else if (
        dResponse?.statusString &&
        dResponse?.statusString.toLowerCase() == "failed"
      ) {
        await pMap(
          payments,
          async (payment) => {
            await PaymentModel.findByIdAndUpdate(payment._id, {
              disbursed: "not-disbursed",
            });
          },
          { concurrency: 10 }
        );
      }
    });

    return BuildHttpResponse(res, 200, "success");
  } catch (error) {
    return BuildHttpResponse(res, 500, error.message);
  }
};
