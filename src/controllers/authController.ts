import { Request, Response } from "express";
import authService from "../services/authService";
import { validateRegisterInput, validateLoginInput } from "../utils/validators";
import { logger } from "../utils/logger";

class AuthController {
  /**
   * Register a new user
   */
  async register(req: Request, res: Response): Promise<void> {
    try {
      // Validate input
      const { error } = validateRegisterInput(req.body);
      if (error) {
        res.status(400).json({ message: error.details[0].message });
        return;
      }

      // Register user
      const result = await authService.registerUser(req.body);
      res.status(201).json(result);
    } catch (error: any) {
      logger.error("Register error:", error);

      if (error.message === "User with this email already exists") {
        res.status(409).json({ message: error.message });
      } else {
        res
          .status(500)
          .json({ message: "An error occurred during registration." });
      }
    }
  }

  /**
   * Login a user
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      // Validate input
      const { error } = validateLoginInput(req.body);
      if (error) {
        res.status(400).json({ message: error.details[0].message });
        return;
      }

      // Login user
      const result = await authService.loginUser(req.body);
      res.status(200).json(result);
    } catch (error: any) {
      logger.error("Login error:", error);

      if (error.message === "Invalid email or password") {
        res.status(401).json({ message: error.message });
      } else {
        res.status(500).json({ message: "An error occurred during login." });
      }
    }
  }
}

export default new AuthController();
