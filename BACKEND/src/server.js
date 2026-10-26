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

// health endpoint
app.get("/", (_, res) => {
  res.json({ message: "Health is ok!" });
});

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
      if (server.listening) {
        console.log(`Server is running on http://localhost:${PORT}`);
      }
    });

    server.on("error", (error) => {
      if (error.code === "EADDRINUSE") {
        console.error(
          `PORT ${PORT} is already in use. Stop the other process or set PORT to a free port in .env.`,
        );
      } else if (error.code === "EACCES") {
        console.error(
          `PORT ${PORT} is not allowed on this machine (reserved/blocked). Set a different PORT in .env.`,
        );
      } else {
        console.error("Server failed to start:", error.message);
      }
      process.exit(1);
    });
  })
  .catch((error) => {
    console.error("Failed to connect to database:", error.message);
    process.exit(1);
  });
