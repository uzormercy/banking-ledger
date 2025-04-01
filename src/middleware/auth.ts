import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User from "../models/user";
import { logger } from "../utils/logger";

export interface AuthRequest extends Request {
  user?: any;
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ message: "Access denied. No token provided." });
      return;
    }

    const token = authHeader.split(" ")[1];

    // Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key"
    ) as { id: string };

    // Find user
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      res.status(401).json({ message: "Invalid token, user not found." });
      return;
    }

    // Add user to request
    req.user = user;
    next();
  } catch (error) {
    logger.error("Authentication error:", error);

    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ message: "Token expired." });
    } else if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ message: "Invalid token." });
    } else {
      res.status(500).json({ message: "Internal server error." });
    }
  }
};
