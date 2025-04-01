import { Response } from "express";
import mongoose from "mongoose";
import { AuthRequest } from "../middleware/auth";
import accountService from "../services/accountService";
import {
  validateAccountInput,
  validateAccountUpdateInput,
} from "../utils/validators";
import { logger } from "../utils/logger";

class AccountController {
  /**
   * Create a new account
   */
  async createAccount(req: AuthRequest, res: Response): Promise<void> {
    try {
      // Validate input
      const { error } = validateAccountInput(req.body);
      if (error) {
        res.status(400).json({ message: error.details[0].message });
        return;
      }

      // Create account
      const account = await accountService.createAccount({
        userId: req.user._id,
        name: req.body.name,
        type: req.body.type,
        currency: req.body.currency,
        initialBalance: req.body.initialBalance || 0,
        metadata: req.body.metadata,
      });

      res.status(201).json(account);
    } catch (error: any) {
      logger.error("Create account error:", error);
      res
        .status(500)
        .json({ message: "An error occurred while creating the account." });
    }
  }

  /**
   * Get account by ID
   */
  async getAccount(req: AuthRequest, res: Response): Promise<void> {
    try {
      const accountId = req.params.id;

      // Validate ID format
      if (!mongoose.Types.ObjectId.isValid(accountId)) {
        res.status(400).json({ message: "Invalid account ID format" });
        return;
      }

      // Get account
      const account = await accountService.getAccountById(
        accountId,
        req.user._id
      );

      if (!account) {
        res.status(404).json({ message: "Account not found" });
        return;
      }

      res.status(200).json(account);
    } catch (error: any) {
      logger.error("Get account error:", error);
      res
        .status(500)
        .json({ message: "An error occurred while fetching the account." });
    }
  }

  /**
   * Get all accounts for current user
   */
  async getUserAccounts(req: AuthRequest, res: Response): Promise<void> {
    try {
      const currency = req.query.currency as string | undefined;
      const accounts = await accountService.getUserAccounts(
        req.user._id,
        currency
      );
      res.status(200).json(accounts);
    } catch (error: any) {
      logger.error("Get user accounts error:", error);
      res
        .status(500)
        .json({ message: "An error occurred while fetching accounts." });
    }
  }

  /**
   * Update account details
   */
  async updateAccount(req: AuthRequest, res: Response): Promise<void> {
    try {
      const accountId = req.params.id;

      // Validate ID format
      if (!mongoose.Types.ObjectId.isValid(accountId)) {
        res.status(400).json({ message: "Invalid account ID format" });
        return;
      }

      // Validate input
      const { error } = validateAccountUpdateInput(req.body);
      if (error) {
        res.status(400).json({ message: error.details[0].message });
        return;
      }

      // Update account
      const account = await accountService.updateAccount(
        accountId,
        req.user._id,
        req.body
      );

      if (!account) {
        res.status(404).json({ message: "Account not found" });
        return;
      }

      res.status(200).json(account);
    } catch (error: any) {
      logger.error("Update account error:", error);
      res
        .status(500)
        .json({ message: "An error occurred while updating the account." });
    }
  }

  /**
   * Close account
   */
  async closeAccount(req: AuthRequest, res: Response): Promise<void> {
    try {
      const accountId = req.params.id;

      // Validate ID format
      if (!mongoose.Types.ObjectId.isValid(accountId)) {
        res.status(400).json({ message: "Invalid account ID format" });
        return;
      }

      // Close account
      try {
        const account = await accountService.closeAccount(
          accountId,
          req.user._id
        );
        res
          .status(200)
          .json({ message: "Account closed successfully", account });
      } catch (error: any) {
        if (error.message === "Account not found") {
          res.status(404).json({ message: error.message });
        } else if (
          error.message === "Account must have zero balance to be closed"
        ) {
          res.status(400).json({ message: error.message });
        } else {
          throw error;
        }
      }
    } catch (error: any) {
      logger.error("Close account error:", error);
      res
        .status(500)
        .json({ message: "An error occurred while closing the account." });
    }
  }
}

export default new AccountController();
