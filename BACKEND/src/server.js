import express from "express";
import "dotenv/config";
import cookieParser from "cookie-parser";
import path from "path";

import { connectDb } from "./config/db.js";

import authRoute from "./routes/authRoute.js";
import userRoute from "./routes/userRoute.js";
import conversationRoute from "./routes/conversationRoute.js";
import messageRoute from "./routes/messageRoute.js";

const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());

app.use("/uploads", express.static(path.resolve("uploads")));

// Routes
app.use("/api/auth", authRoute);
app.use("/api/users", userRoute);
app.use("/api/conversations", conversationRoute);
app.use("/api/messages", messageRoute);

// Start server
const PORT = process.env.PORT || 5000;

connectDb()
  .then(() => {
    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
    process.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        console.error(`Port ${PORT} is already in use`);
      } else {
        console.error("Server error:", err);
      }
      process.exit(1);
    });
    process.on("uncaughtException", (err) => {
      console.error("Uncaught exception:", err);
      server.close(() => process.exit(1));
    });
    process.on("unhandledRejection", (reason, promise) => {
      console.error("Unhandled rejection at:", promise, "reason:", reason);
      server.close(() => process.exit(1));
    });
  })
  .catch((error) => {
    console.error("Database connection failed:", error);
  });
