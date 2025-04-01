import express, { Application, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";

// Import routes
import authRoutes from "./routes/authRoutes";
import accountRoutes from "./routes/accountRoutes";
import transactionRoutes from "./routes/transactionRoutes";

// Import error handlers
import { errorHandler, setupErrorHandlers } from "./middleware/errorHandler";

const app: Application = express();

// Set security HTTP headers
app.use(helmet());

// Enable CORS
app.use(cors());

// Parse JSON bodies
app.use(express.json({ limit: "10kb" }));

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// Compress responses
app.use(compression());

// Logger middleware
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Set up routes
app.use("/api/auth", authRoutes);
app.use("/api/accounts", accountRoutes);
app.use("/api/transactions", transactionRoutes);

// Health check endpoint
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "UP", message: "API is running" });
});

// Handle 404 errors
app.use((_req: Request, res: Response) => {
  res.status(404).json({ message: "Endpoint not found" });
});

// Global error handler
app.use(errorHandler);

// Set up global error handlers for unhandled rejections and exceptions
setupErrorHandlers();

export default app;
