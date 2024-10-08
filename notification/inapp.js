const UserModel = require("../models/user");
const GroupModel = require("../models/group");
const MessageModel = require("../models/message");
const FirebaseService = require("./firebase");
const processQueueManager = require("../processQueue");
let pMap;
(async () => {
  pMap = (await import("p-map")).default;
})();
class InAppNotificationService {
  static async sendNotification({
    medium = "token",
    topicTokenOrGroupId,
    exemptUsers = [],
    name,
    userId,
    groupId = null,
    memberId = null,
    requesterId = null,
    chatMessageId = null,
  }) {
    const processQueue = processQueueManager.getProcessQueue();
    const data = {
      event: "inAppNotificationEvent",
      type: name,
      topicTokenOrGroupId,
      medium,
      name,
      userId,
      groupId,
      exemptUsers,
      memberId,
      requesterId,
      chatMessageId,
      handler: this.handleNotificationProcess,
    };

    await processQueue.add(data, {
      attempts: 2,
      backoff: {
        type: "jitter",
      },
    });
  }

  static async handleNotificationProcess(data) {
    const { medium, topicTokenOrGroupId, name, exemptUsers } = data;
    const userId = data.userId;
    const groupId = data.groupId;
    const memberId = data.memberId;
    const requesterId = data.requesterId;
    console.log(`checking requester ${requesterId} and member ${memberId} ids`);
    const chatMessageId = data.chatMessageId;
    let obj = { name };

    if (userId) {
      const user = await UserModel.findById(userId);
      obj = { ...obj, user };
    }

    if (groupId) {
      const group = await GroupModel.findById(groupId);
      obj = { ...obj, group };

      if (memberId) {
        console.log({ memberId });
        const member = await group.findMemberById(memberId);
        const memberUser = await UserModel.findById(member?.user?._id);
        const newMemberUser = {
          ...memberUser.toObject(),
          member: member.toObject(),
        };
        obj = { ...obj, memberUser: newMemberUser };
      }

      if (requesterId) {
        console.log({ requesterId });
        let requester = await UserModel.findById(requesterId);
        obj = { ...obj, requester };
      }
    }

    if (chatMessageId) {
      const chatMessage = await MessageModel.findById(chatMessageId).populate(
        "sender",
        "username avatarUrl email"
      );
      // Ensure the sender is only added to the exemptUsers list once
      if (!exemptUsers.includes(chatMessage?.sender?._id.toString())) {
        exemptUsers.push(chatMessage?.sender?._id.toString());
      }
      obj = { ...obj, chatMessage };
    }

    // Construct the notification in a structured way (no JSON.stringify)
    const notification = await InAppNotificationService.getNotification(obj);

    if (medium === "topic") {
      await FirebaseService.sendNotificationToTopic(
        topicTokenOrGroupId,
        notification.subject, // Title of the notification
        notification.body || notification.notificationMessage, // Message body
        notification.data // Optional data payload
      );
    } else if (["group", "token"].includes(medium)) {
      let recipientTokens = [];
      if (medium === "group") {
        const group = await GroupModel.findById(topicTokenOrGroupId).populate({
          path: "members.user",
          select: "username email deviceToken",
        });
        for (const m of group?.members) {
          if (
            exemptUsers.includes(m?.user?._id.toString()) ||
            exemptUsers.includes(m?.user.toString())
          )
            continue;

          if (m?.user?.deviceToken && m?.user?.deviceToken !== "") {
            recipientTokens.push(m?.user?.deviceToken);
          }
        }
      } else if (medium === "token") {
        recipientTokens.push(topicTokenOrGroupId);
      }

      // Send the notification to recipient tokens
      await pMap(
        recipientTokens,
        async (recipientToken) => {
          await FirebaseService.sendNotification(
            recipientToken,
            notification.subject, // Title of the notification
            notification.body || notification.notificationMessage, // Message body
            notification.data // Optional data payload
          );
        },
        { concurrency: 100 }
      );
    }
  }

  // Function to construct the notification object
  static async getNotification({
    name,
    group,
    user,
    chatMessage,
    memberUser,
    requester,
  }) {
    let notification = { name, subject: name };

    switch (name) {
      case "messageReceived":
        notification = {
          subject: "New message received",
          body: `${chatMessage?.sender?.username}: ${chatMessage?.content}`,
          data: {
            type: "chat",
            groupId: group._id,
            sender: chatMessage?.sender?.username,
            content: chatMessage?.content,
          },
        };
        break;
      case "joinrequest":
        notification = {
          subject: "Join Request",
          body: `${requester.username} requested to join ${group.groupName}`,
          data: {
            type: "notification",
            groupId: group._id,
          },
        };
        break;
      case "invoiceSent":
        notification = {
          subject: "Invoice Sent",
          body: `Inovice for ${group.groupName} has been sent to your email, please check spam as well.`,
          data: {
            type: "notification",
            groupId: group._id,
          },
        };
        break;
      case "missingBankDetails":
        notification = {
          subject: `Missing Bank Details!`,
          body: `Your account is missing Bank details for disbursement!`,
          data: {
            type: "notification",
            groupId: group._id,
          },
        };
        break;
      case "disbursementSuccessful":
        notification = {
          subject: "Payment Disbursement",
          body: `Payment Disbursement for ${group.groupName} has been processed`,
          data: {
            type: "notification",
            groupId: group._id,
          },
        };
        break;
      case "confirmedStatus":
        console.log({ memberUser });
        notification = {
          subject: "Confirmation Status",
          body: `Your group member ${memberUser.username} for ${group.groupName} has confirmed their status`,
          data: {
            type: "notification",
            groupId: group._id,
          },
        };
        break;
      case "joinRequestAccepted":
        notification = {
          subject: "Request Accepted",
          type: "notification",
          group,
          user,
          notificationMessage: `Your request to join ${group.groupName} has been accepted`,
        };
        break;
      case "joinRequestRejected":
        notification = {
          subject: "Request Rejected",
          type: "notification",
          group,
          user,
          notificationMessage: `Your request to join ${group.groupName} has been rejected`,
        };
        break;
      case "loginAlert":
        notification = {
          subject: `Login`,
          type: "notification",
          user,
          notificationMessage: `You logged in successfully`,
        };
        break;
      case "passwordChangeAlert":
        notification = {
          subject: `Password Changed`,
          type: "notification",
          user,
          notificationMessage: `Your password has been successfully updated`,
        };
        break;
      case "removalFromSubscriptionGroup":
        notification = {
          subject: "Removal Notice",
          type: "notification",
          group,
          user,
          notificationMessage: `You have been removed from ${group.groupName}`,
        };
        break;
      case "memberRemovalUpdateForCreator":
        notification = {
          subject: "Removal Notice",
          type: "notification",
          group,
          user,
          memberUser,
          notificationMessage: `Your member ${memberUser.username} has left/been removed from your group ${group.groupName}`,
        };
        break;
      case "paymentReminder":
        notification = {
          subject: "Payment Reminder",
          type: "notification",
          group,
          user,
          notificationMessage: `Your subscription payment deadline is in 24hrs`,
        };
        break;
      case "memberPaymentReminderForCreator":
        notification = {
          subject: "Payment Reminder",
          type: "notification",
          group,
          user,
          memberUser,
          notificationMessage: `Your member ${memberUser.username} from ${group.groupName} has their subscription payment deadline in 24hrs`,
        };
        break;
      default:
        throw new Error(`inapp notification ${name} does not exist`);
    }

    notification = { ...notification, name };
    return notification;
  }
}

module.exports = InAppNotificationService;
