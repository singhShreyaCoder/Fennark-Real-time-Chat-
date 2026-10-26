import mongoose from "mongoose";

export const connectDb = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is missing. Create one and set MONGO_URI.");
  }

  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log(`MONGODB CONNECTED SUCCESSFULLY ${conn.connection.host}`);
  } catch (error) {
    console.log("MONGODB CONNECTION FAILED", error.message);
    throw error;
  }
};
