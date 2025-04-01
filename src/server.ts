import app from "./app";
import { connectDB } from "./config/database";
import { logger } from "./utils/logger";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB()
  .then(() => {
    // Start the server
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    logger.error("Database connection failed:", error);
    process.exit(1);
  });

// Handle graceful shutdown
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received. Shutting down gracefully");
  process.exit(0);
});
