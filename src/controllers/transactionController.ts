import { Response } from "express";
import mongoose from "mongoose";
import { AuthRequest } from "../middleware/auth";
import transactionService from "../services/transactionService";
import {
  validateDepositInput,
  validateWithdrawalInput,
  validateTransferInput,
  validateTransactionQueryInput,
} from "../utils/validators";
import { getPaginationMetadata } from "../utils/helpers";
import { logger } from "../utils/logger";

class TransactionController {
  /**
   * Process a deposit transaction
   */
  async deposit(req: AuthRequest, res: Response): Promise<void> {
    try {
      // Validate input
      const { error } = validateDepositInput(req.body);
      if (error) {
        res.status(400).json({ message: error.details[0].message });
        return;
      }

      // Check account ID format
      if (!mongoose.Types.ObjectId.isValid(req.body.accountId)) {
        res.status(400).json({ message: "Invalid account ID format" });
        return;
      }

      // Process deposit
      try {
        const transaction = await transactionService.deposit({
          userId: req.user._id,
          accountId: new mongoose.Types.ObjectId(req.body.accountId),
          amount: req.body.amount,
          currency: req.body.currency,
          description: req.body.description,
          metadata: req.body.metadata,
        });

        res.status(201).json(transaction);
      } catch (error: any) {
        if (error.message === "Account not found") {
          res.status(404).json({ message: error.message });
        } else if (error.message === "Currency mismatch") {
          res.status(400).json({ message: error.message });
        } else {
          throw error;
        }
      }
    } catch (error: any) {
      logger.error("Deposit error:", error);
      res
        .status(500)
        .json({ message: "An error occurred while processing the deposit." });
    }
  }

  /**
   * Process a withdrawal transaction
   */
  async withdraw(req: AuthRequest, res: Response): Promise<void> {
    try {
      // Validate input
      const { error } = validateWithdrawalInput(req.body);
      if (error) {
        res.status(400).json({ message: error.details[0].message });
        return;
      }

      // Check account ID format
      if (!mongoose.Types.ObjectId.isValid(req.body.accountId)) {
        res.status(400).json({ message: "Invalid account ID format" });
        return;
      }

      // Process withdrawal
      try {
        const transaction = await transactionService.withdraw({
          userId: req.user._id,
          accountId: new mongoose.Types.ObjectId(req.body.accountId),
          amount: req.body.amount,
          currency: req.body.currency,
          description: req.body.description,
          metadata: req.body.metadata,
        });

        res.status(201).json(transaction);
      } catch (error: any) {
        if (error.message === "Account not found") {
          res.status(404).json({ message: error.message });
        } else if (error.message === "Currency mismatch") {
          res.status(400).json({ message: error.message });
        } else if (error.message === "Insufficient funds") {
          res.status(400).json({ message: error.message });
        } else {
          throw error;
        }
      }
    } catch (error: any) {
      logger.error("Withdrawal error:", error);
      res
        .status(500)
        .json({
          message: "An error occurred while processing the withdrawal.",
        });
    }
  }

  /**
   * Process a transfer transaction
   */
  async transfer(req: AuthRequest, res: Response): Promise<void> {
    try {
      // Validate input
      const { error } = validateTransferInput(req.body);
      if (error) {
        res.status(400).json({ message: error.details[0].message });
        return;
      }

      // Check account ID formats
      if (
        !mongoose.Types.ObjectId.isValid(req.body.sourceAccountId) ||
        !mongoose.Types.ObjectId.isValid(req.body.destinationAccountId)
      ) {
        res.status(400).json({ message: "Invalid account ID format" });
        return;
      }

      // Process transfer
      try {
        const transaction = await transactionService.transfer({
          userId: req.user._id,
          sourceAccountId: new mongoose.Types.ObjectId(
            req.body.sourceAccountId
          ),
          destinationAccountId: new mongoose.Types.ObjectId(
            req.body.destinationAccountId
          ),
          amount: req.body.amount,
          currency: req.body.currency,
          description: req.body.description,
          metadata: req.body.metadata,
        });

        res.status(201).json(transaction);
      } catch (error: any) {
        if (
          error.message === "Source account not found" ||
          error.message === "Destination account not found"
        ) {
          res.status(404).json({ message: error.message });
        } else if (
          error.message === "Source account currency mismatch" ||
          error.message === "Destination account currency mismatch"
        ) {
          res.status(400).json({ message: error.message });
        } else if (error.message === "Insufficient funds") {
          res.status(400).json({ message: error.message });
        } else {
          throw error;
        }
      }
    } catch (error: any) {
      logger.error("Transfer error:", error);
      res
        .status(500)
        .json({ message: "An error occurred while processing the transfer." });
    }
  }

  /**
   * Get transaction by ID
   */
  async getTransaction(req: AuthRequest, res: Response): Promise<void> {
    try {
      const transactionId = req.params.id;

      // Validate ID format
      if (!mongoose.Types.ObjectId.isValid(transactionId)) {
        res.status(400).json({ message: "Invalid transaction ID format" });
        return;
      }

      // Get transaction
      const transaction = await transactionService.getTransactionById(
        transactionId,
        req.user._id
      );

      if (!transaction) {
        res.status(404).json({ message: "Transaction not found" });
        return;
      }

      res.status(200).json(transaction);
    } catch (error: any) {
      logger.error("Get transaction error:", error);
      res
        .status(500)
        .json({ message: "An error occurred while fetching the transaction." });
    }
  }

  /**
   * Get transactions with pagination and filtering
   */
  async getTransactions(req: AuthRequest, res: Response): Promise<void> {
    try {
      // Validate query parameters
      const { error } = validateTransactionQueryInput(req.query);
      if (error) {
        res.status(400).json({ message: error.details[0].message });
        return;
      }

      // Build query params
      const queryParams = {
        userId: req.user._id,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
      } as any;

      // Add optional filters
      if (
        req.query.accountId &&
        mongoose.Types.ObjectId.isValid(req.query.accountId as string)
      ) {
        queryParams.accountId = new mongoose.Types.ObjectId(
          req.query.accountId as string
        );
      }

      if (req.query.type) {
        queryParams.type = req.query.type;
      }

      if (req.query.startDate) {
        queryParams.startDate = new Date(req.query.startDate as string);
      }

      if (req.query.endDate) {
        queryParams.endDate = new Date(req.query.endDate as string);
      }

      // Get transactions
      const result = await transactionService.getTransactions(queryParams);

      // Format response
      res.status(200).json({
        transactions: result.transactions,
        pagination: getPaginationMetadata(
          result.page,
          result.limit,
          result.total
        ),
      });
    } catch (error: any) {
      logger.error("Get transactions error:", error);
      res
        .status(500)
        .json({ message: "An error occurred while fetching transactions." });
    }
  }

  /**
   * Get ledger entries for an account
   */
  async getLedgerEntries(req: AuthRequest, res: Response): Promise<void> {
    try {
      const accountId = req.params.accountId;

      // Validate ID format
      if (!mongoose.Types.ObjectId.isValid(accountId)) {
        res.status(400).json({ message: "Invalid account ID format" });
        return;
      }

      // Parse pagination params
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      // Get ledger entries
      const result = await transactionService.getLedgerEntries(
        new mongoose.Types.ObjectId(accountId),
        page,
        limit
      );

      // Format response
      res.status(200).json({
        entries: result.entries,
        pagination: getPaginationMetadata(
          result.page,
          result.limit,
          result.total
        ),
      });
    } catch (error: any) {
      logger.error("Get ledger entries error:", error);
      res
        .status(500)
        .json({ message: "An error occurred while fetching ledger entries." });
    }
  }
}

export default new TransactionController();
