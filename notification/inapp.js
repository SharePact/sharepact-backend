const { paymentReminderForInactiveMembers } = require("../controllers/cronjob");
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
        const member = await group.findMemberById(memberId);
        const memberUser = await UserModel.findById(member.user._id);
        memberUser = { ...memberUser, member };
        obj = { ...obj, memberUser };
      }
    }

    if (chatMessageId) {
      const chatMessage = await MessageModel.findById(chatMessageId).populate(
        "sender",
        "username avatarUrl email"
      );
      obj = { ...obj, chatMessage };
    }

    const notification = await InAppNotificationService.getNotification(obj);

    const message = JSON.stringify(notification);

    if (medium == "topic") {
      await FirebaseService.sendNotificationToTopic(
        topicTokenOrGroupId,
        notification?.subject,
        message
      );
    } else if (["group", "token"].includes(medium)) {
      let recepientTokens = [];
      if (medium == "group") {
        const group = await GroupModel.findById(topicTokenOrGroupId).populate({
          path: "members.user",
          select: "username email deviceToken",
        });
        for (const m of group?.members) {
          if (exemptUsers.includes(m?.user?._id)) continue;

          if (m?.user?.deviceToken && m?.user?.deviceToken != "") {
            recepientTokens.push(m?.user?.deviceToken);
          }
        }
      } else if (medium == "token") {
        recepientTokens.push(topicTokenOrGroupId);
      }

      await pMap(
        recepientTokens,
        async (recepientToken) => {
          await FirebaseService.sendNotification(
            recepientToken,
            notification?.subject,
            message
          );
        },
        { concurrency: 100 }
      );
    }
  }

  static async getNotification({ name, group, user, chatMessage, memberUser }) {
    let notification = { name, subject: name };

    switch (name) {
      case "messageReceived":
        notification = {
          subject: "message received",
          type: "chat",
          group,
          user,
          message: chatMessage,
        };
        break;
      case "joinrequest":
        notification = {
          subject: `${memberUser.username} requested to join ${group.groupName}`,
          type: "notification",
          group,
          user,
          memberUser,
          notificationMessage: `${memberUser.username} requested to join ${group.groupName}`,
        };
        break;
      case "joinRequestAccepted":
        notification = {
          subject: `your request to join ${group.groupName} has been accepted`,
          type: "notification",
          group,
          user,
          notificationMessage: `your request to join ${group.groupName} has been accepted`,
        };
        break;
      case "joinRequestRejected":
        notification = {
          subject: `your request to join ${group.groupName} has been rejected`,
          type: "notification",
          group,
          user,
          notificationMessage: `your request to join ${group.groupName} has been rejected`,
        };
        break;
      case "loginAlert":
        notification = {
          subject: `you logged in successfully`,
          type: "notification",
          user,
          notificationMessage: `you logged in successfully`,
        };
        break;
      case "passwordChangeAlert":
        notification = {
          subject: `your password has been successfully updated`,
          type: "notification",
          user,
          notificationMessage: `your password has been successfully updated`,
        };
        break;
      case "removalFromSubscriptionGroup":
        notification = {
          subject: `You have been removed from ${group.groupName}`,
          type: "notification",
          group,
          user,
          notificationMessage: `You have been removed from ${group.groupName}`,
        };
        break;
      case "memberRemovalUpdateForCreator":
        notification = {
          subject: `Your member ${memberUser.username} has left/been removed from your group ${group.groupName}`,
          type: "notification",
          group,
          user,
          memberUser,
          notificationMessage: `Your member ${memberUser.username} has left/been removed from your group ${group.groupName}`,
        };
        break;
      case "paymentReminder":
        notification = {
          subject: `Your subscription payment deadline is in 24hrs`,
          type: "notification",
          group,
          user,
          notificationMessage: `Your subscription payment deadline is in 24hrs`,
        };
        break;
      case "memberPaymentReminderForCreator":
        notification = {
          subject: `Your member ${memberUser.username} from ${group.groupName} has their subscription payment deadline in 24hrs`,
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
