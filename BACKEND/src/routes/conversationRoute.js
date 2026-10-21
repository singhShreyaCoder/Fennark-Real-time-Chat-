import express from "express";
import {
  createConversation,
  getMyConversations,
} from "../controllers/conversationController.js";
import { protectRoute } from "../middleware/protectRoute.js";

const router = express.Router();

router.post("/", protectRoute, createConversation);
router.get("/", protectRoute, getMyConversations);

export default router;
