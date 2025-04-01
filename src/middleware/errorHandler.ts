import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

// Handle known operational errors
export const errorHandler = (
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Set default error status and message
  err.statusCode = err.statusCode || 500;
  err.message = err.message || "Internal Server Error";

  // Log error
  if (err.statusCode === 500) {
    logger.error("Server Error:", err);
  } else {
    logger.warn("Operational Error:", err);
  }

  // Check if in production and error is not operational
  if (process.env.NODE_ENV === "production" && !err.isOperational) {
    // Don't leak error details in production for non-operational errors
    res.status(500).json({
      status: "error",
      message: "Something went wrong",
    });
    return;
  }

  // Send error response
  res.status(err.statusCode).json({
    status: err.statusCode >= 500 ? "error" : "fail",
    message: err.message,
  });
};

// Custom error class for operational errors
export class OperationalError extends Error implements AppError {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

// Handle unhandled rejections and uncaught exceptions
export const setupErrorHandlers = (): void => {
  process.on("unhandledRejection", (err: Error) => {
    logger.error("UNHANDLED REJECTION! Shutting down...", err);
    console.error(err);

    // Gracefully shutdown
    process.exit(1);
  });

  process.on("uncaughtException", (err: Error) => {
    logger.error("UNCAUGHT EXCEPTION! Shutting down...", err);
    console.error(err);

    // Gracefully shutdown
    process.exit(1);
  });
};
