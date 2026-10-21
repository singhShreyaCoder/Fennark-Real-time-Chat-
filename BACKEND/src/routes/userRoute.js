import express from "express";
import {
  searchUser,
  getUserById,
  updateProfile,
  getMyProfile,
  deleteMyAccount,
  getAllUsers,
} from "../controllers/userController.js";
import { protectRoute } from "../middleware/protectRoute.js";

const router = express.Router();

router.get("/search", protectRoute, searchUser);
router.get("/all", protectRoute, getAllUsers);
router.get("/me", protectRoute, getMyProfile);
router.patch("/me", protectRoute, updateProfile);
router.delete("/me", protectRoute, deleteMyAccount);
router.get("/:id", protectRoute, getUserById);

export default router;
