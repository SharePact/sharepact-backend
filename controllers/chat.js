const GroupModel = require("../models/group");
const Message = require("../models/message");
const { BuildHttpResponse } = require("../utils/response");
const { ObjectId } = require("mongodb");
const mongoose = require("mongoose");

exports.getMessagesByGroup = async (req, res) => {
  let groupId = new ObjectId();
  try {
    groupId = new ObjectId(req.params.groupId);
  } catch (err) {
    return BuildHttpResponse(res, 404, "Group not found");
  }
  try {
    let { cursor, limit } = req.query;
    const userId = req.user._id;

    const group = await GroupModel.findById(groupId);
    if (!group) return BuildHttpResponse(res, 404, "Group not found");

    if (!(await group.isUserAMember(userId)))
      return BuildHttpResponse(res, 404, "user is not a member of this group");

    const { messages, nextCursor } = await Message.getMessagesByGroup(
      groupId,
      parseInt(limit, 10) || 10,
      cursor ? cursor : null
    );

    return BuildHttpResponse(res, 200, "successful", {
      messages,
      nextCursor,
    });
  } catch (err) {
    return BuildHttpResponse(res, 500, err.message);
  }
};

exports.getUnreadMessagesCount = async (req, res) => {
  let groupId = new ObjectId();
  try {
    groupId = new ObjectId(req.params.groupId);
  } catch (err) {
    return BuildHttpResponse(res, 404, "Group not found");
  }

  try {
    const group = await GroupModel.findById(groupId);
    if (!group) return BuildHttpResponse(res, 404, "Group not found");
    const userId = req.user._id;

    if (!(await group.isUserAMember(userId)))
      return BuildHttpResponse(res, 404, "user is not a member of this group");

    const count = await Message.getUnreadMessagesCountByGroup(userId, groupId);

    return BuildHttpResponse(res, 200, "successful", {
      count,
    });
  } catch (err) {
    return BuildHttpResponse(res, 500, err.message);
  }
};

exports.markMessagesAsRead = async (req, res) => {
  try {
    const { groupId, messageIds } = req.body;
    const userId = req.user._id;

    if (groupId) {
      const group = await GroupModel.findById(groupId);
      if (!group) return BuildHttpResponse(res, 404, "Group not found");

      await Message.markAllMessagesAsReadByGroup(userId, groupId);
    }

    if (messageIds && messageIds?.length > 0) {
      await Message.markMessagesAsReadByIds(userId, messageIds);
    }
    return BuildHttpResponse(res, 200, "successful");
  } catch (err) {
    return BuildHttpResponse(res, 500, err.message);
  }
};
