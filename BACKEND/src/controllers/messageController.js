import mongoose from "mongoose";
import Message from "../models/message.js";
import Conversation from "../models/conversation.js";

export async function sendMessage(req, res) {
  try {
    const { conversationId, content } = req.body;
    const senderId = req.user._id;

    if (!conversationId) {
      return res.status(400).json({ message: "Conversation ID is required" });
    }

    if (!mongoose.isValidObjectId(conversationId)) {
      return res.status(400).json({ message: "Invalid conversation ID" });
    }

    if (content !== undefined && typeof content !== "string") {
      return res.status(400).json({ message: "Invalid message data" });
    }

    const messageContent = content?.trim() || "";

    if (messageContent.length > 5000) {
      return res.status(400).json({
        message: "Message content cannot exceed 5000 characters",
      });
    }

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: senderId,
    });

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    const messageAttachments = (req.files || []).map((file) => ({
      url: `/uploads/${file.filename}`,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    }));

    if (!messageContent && messageAttachments.length === 0) {
      return res.status(400).json({
        message: "Message must contain text or an attachment",
      });
    }

    const message = await Message.create({
      conversation: conversationId,
      sender: senderId,
      content: messageContent,
      attachments: messageAttachments,
      readBy: [senderId],
    });

    conversation.lastMessage = message._id;
    await conversation.save();

    return res.status(201).json({
      message: "Message sent successfully",
      newMessage: message,
    });
  } catch (error) {
    console.error("Error in sendMessage controller:", error.message);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function getMessages(req, res) {
  try {
    const { conversationId } = req.params;

    if (!mongoose.isValidObjectId(conversationId)) {
      return res.status(400).json({ message: "Invalid conversation ID" });
    }

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

    if (
      !Number.isInteger(page) ||
      !Number.isInteger(limit) ||
      page < 1 ||
      limit < 1 ||
      limit > 50
    ) {
      return res.status(400).json({
        message: "Page must be positive and limit must be between 1 and 50",
      });
    }

    const skip = (page - 1) * limit;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: req.user._id,
    });

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    const messages = await Message.find({ conversation: conversationId })
      .populate("sender", "username profilePicture")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalMessages = await Message.countDocuments({
      conversation: conversationId,
    });

    return res.status(200).json({
      message: "Messages fetched successfully",
      page,
      limit,
      totalMessages,
      totalPages: Math.ceil(totalMessages / limit),
      messages,
    });
  } catch (error) {
    console.error("Error on getMessages controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function deleteForMe(req, res) {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    if (!mongoose.isValidObjectId(messageId)) {
      return res.status(400).json({ message: "Invalid message ID" });
    }

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    const conversation = await Conversation.findOne({
      _id: message.conversation,
      participants: userId,
    });
    if (!conversation) {
      return res.status(404).json({ message: "Message not found" });
    }

    const alreadyDeleted = message.deletedFor.some(
      (id) => id.toString() === userId.toString(),
    );
    if (alreadyDeleted) {
      return res
        .status(200)
        .json({ message: "Message is already deleted for you" });
    }

    message.deletedFor.push(userId);
    await message.save();

    return res
      .status(200)
      .json({ message: "Message deleted for you successfully" });
  } catch (error) {
    console.error("Error in deleteForMe controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function deleteForEveryone(req, res) {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    if (!mongoose.isValidObjectId(messageId)) {
      return res.status(400).json({ message: "Invalid message ID" });
    }

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (message.sender.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "You can only delete your own messages" });
    }

    if (message.isDeleted) {
      return res.status(400).json({ message: "Message already deleted" });
    }

    message.isDeleted = true;
    message.deletedAt = new Date();
    message.content = "";
    message.attachments = [];

    await message.save();

    return res.status(200).json({ message: "Message deleted for everyone" });
  } catch (error) {
    console.error("Error in deleteForEveryone controller", error.message);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function markMessagesAsRead(req, res) {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId,
    });

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    await Message.updateMany(
      {
        conversation: conversationId,
        sender: { $ne: userId },
      },
      {
        $addToSet: { readBy: userId },
      },
    );

    return res.status(200).json({ message: "Messages marked as read" });
  } catch (error) {
    console.error("Error in markMessagesAsRead controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function getUnreadMessagesCount(req, res) {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId,
    });

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    const unreadCount = await Message.countDocuments({
      conversation: conversationId,
      sender: { $ne: userId },
      readBy: { $ne: userId },
      deletedFor: { $ne: userId },
      isDeleted: { $ne: true },
    });

    return res.status(200).json({ unreadCount });
  } catch (error) {
    console.error("Error in getUnreadMessagesCount controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}
