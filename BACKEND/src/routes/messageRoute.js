import express from "express";
import {
  sendMessage,
  getMessages,
  deleteForMe,
  deleteForEveryone,
  markMessagesAsRead,
  getUnreadMessagesCount,
} from "../controllers/messageController.js";
import { protectRoute } from "../middleware/protectRoute.js";
import upload from "../middleware/upload.js";

const router = express.Router();

router.post("/", protectRoute, upload.array("attachments", 5), sendMessage);

router.get("/:conversationId", protectRoute, getMessages);

router.patch("/:conversationId/read", protectRoute, markMessagesAsRead);

router.get("/:conversationId/unread", protectRoute, getUnreadMessagesCount);

router.delete("/:messageId/me", protectRoute, deleteForMe);

router.delete("/:messageId/everyone", protectRoute, deleteForEveryone);

export default router;
