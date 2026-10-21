import jwt from "jsonwebtoken";
import User from "../models/user.js";

export async function protectRoute(req, res, next) {
  try {
    const token = req.cookies?.jwt;

    if (!token) {
      return res.status(401).json({
        message: "Unauthorized: Please log in first",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded.userId) {
      return res.status(401).json({
        message: "Invalid token",
      });
    }

    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(401).json({
        message: "User not found. Please log in again",
      });
    }

    req.user = user;

    next();
  } catch (error) {
    if (
      error.name === "TokenExpiredError" ||
      error.name === "JsonWebTokenError"
    ) {
      return res.status(401).json({
        message: "Invalid or expired token. Please log in again",
      });
    }

    console.error("Protect route error:", error.message);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}
