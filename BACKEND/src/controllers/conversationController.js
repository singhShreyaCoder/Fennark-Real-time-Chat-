import mongoose from "mongoose";
import Conversation from "../models/conversation.js";
import User from "../models/user.js";

export async function createConversation(req, res) {
  try {
    const { receiverId } = req.body;
    const senderId = req.user._id;

    if (!receiverId) {
      return res.status(400).json({ message: "Receiver ID is required" });
    }

    if (!mongoose.isValidObjectId(receiverId)) {
      return res.status(400).json({ message: "Invalid receiver ID" });
    }

    if (senderId.toString() == receiverId) {
      return res.status(400).json({ message: "You cannot chat with yourself" });
    }

    const receiver = await User.findById(receiverId);

    if (!receiver) {
      return res.status(404).json({ message: "Receiver not found" });
    }

    const existingConversation = await Conversation.findOne({
      isGroup: false,
      participants: { $all: [senderId, receiverId] },
    });
    if (existingConversation) {
      return res.status(200).json({
        message: "Conversation already exists",
        conversation: existingConversation,
      });
    }

    const conversation = await Conversation.create({
      participants: [senderId, receiverId],
      isGroup: false,
    });

    return res
      .status(201)
      .json({ message: "Conversation created successfully", conversation });
  } catch (error) {
    console.error("Error in createConversation controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function getMyConversations(req, res) {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id,
    })
      .populate("participants", "username profilePicture isOnline lastSeen")
      .populate("lastMessage")
      .sort({ updatedAt: -1 });

    res
      .status(200)
      .json({ message: "Conversations fetched successfully", conversations });
  } catch (error) {
    console.error("Error in getMyConversations controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}
