import mongoose from "mongoose";
import dns from "node:dns";

const FALLBACK_DNS = (process.env.FALLBACK_DNS || "8.8.8.8,1.1.1.1")
  .split(",")
  .map((s) => s.trim());

const ensureDnsWorks = async () => {
  const resolver = new dns.Resolver({ timeout: 3000, tries: 1 });
  try {
    await resolver.resolve("mongodb.net");
  } catch {
    dns.setServers(FALLBACK_DNS);
    console.log(
      `System DNS resolver unreachable - using DNS ${FALLBACK_DNS.join(", ")}`,
    );
  }
};

export const connectDb = async () => {
  try {
    await ensureDnsWorks();
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MONGODB CONNECTED SUCCESSFULLY ${conn.connection.host}`);
  } catch (error) {
    console.log("MONGODB CONNECTION FAILED", error);
  }
};
