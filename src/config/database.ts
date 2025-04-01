import mongoose from "mongoose";
import { logger } from "../utils/logger";

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/banking-ledger";
const NODE_ENV = process.env.NODE_ENV || "development";

// Flag to determine if transactions should be used
export const useTransactions = NODE_ENV === "production";

// Connection function
export const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(MONGODB_URI);
    logger.info("MongoDB connected successfully");

    // Only verify transaction support in production
    if (useTransactions) {
      try {
        const session = await mongoose.startSession();
        session.endSession();
        logger.info("MongoDB transaction support verified");
      } catch (error) {
        logger.error("MongoDB transaction support unavailable:", error);
        logger.warn(
          "Running in fallback mode without transaction support. NOT recommended for production!"
        );
      }
    } else {
      logger.info("Running in development mode without transaction support");
    }
  } catch (error) {
    logger.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

// Disconnect function
export const disconnectDB = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    logger.info("MongoDB disconnected");
  } catch (error) {
    logger.error("MongoDB disconnect error:", error);
  }
};

// Export the mongoose instance for transaction usage
export default mongoose;
