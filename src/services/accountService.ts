import mongoose from "mongoose";
import Account, {
  IAccount,
  AccountType,
  AccountStatus,
} from "../models/account";
import { logger } from "../utils/logger";
import { generateAccountNumber } from "../utils/helpers";
import { useTransactions } from "../config/database";

export interface CreateAccountInput {
  userId: mongoose.Types.ObjectId;
  name: string;
  type: AccountType;
  currency: string;
  initialBalance?: number;
  metadata?: Record<string, any>;
}

export interface UpdateAccountInput {
  name?: string;
  status?: AccountStatus;
  metadata?: Record<string, any>;
}

class AccountService {
  /**
   * Create a new account
   */
  async createAccount(accountData: CreateAccountInput): Promise<IAccount> {
    try {
      const accountNumber = await generateAccountNumber();

      const account = new Account({
        userId: accountData.userId,
        accountNumber,
        name: accountData.name,
        type: accountData.type,
        currency: accountData.currency,
        balance: accountData.initialBalance || 0,
        availableBalance: accountData.initialBalance || 0,
        status: AccountStatus.ACTIVE,
        metadata: accountData.metadata || {},
      });

      await account.save();

      return account;
    } catch (error) {
      logger.error("Error creating account:", error);
      throw error;
    }
  }

  /**
   * Get account by ID
   */
  async getAccountById(
    accountId: string,
    userId: mongoose.Types.ObjectId
  ): Promise<IAccount | null> {
    try {
      return await Account.findOne({ _id: accountId, userId });
    } catch (error) {
      logger.error("Error fetching account:", error);
      throw error;
    }
  }

  /**
   * Get account by account number
   */
  async getAccountByNumber(accountNumber: string): Promise<IAccount | null> {
    try {
      return await Account.findOne({ accountNumber });
    } catch (error) {
      logger.error("Error fetching account by number:", error);
      throw error;
    }
  }

  /**
   * Get all accounts for a user
   */
  async getUserAccounts(
    userId: mongoose.Types.ObjectId,
    currency?: string
  ): Promise<IAccount[]> {
    try {
      const query: any = { userId };

      if (currency) {
        query.currency = currency;
      }

      return await Account.find(query).sort({ createdAt: -1 });
    } catch (error) {
      logger.error("Error fetching user accounts:", error);
      throw error;
    }
  }

  /**
   * Update account details
   */
  async updateAccount(
    accountId: string,
    userId: mongoose.Types.ObjectId,
    updateData: UpdateAccountInput
  ): Promise<IAccount | null> {
    try {
      const account = await Account.findOneAndUpdate(
        { _id: accountId, userId },
        { $set: updateData },
        { new: true }
      );

      return account;
    } catch (error) {
      logger.error("Error updating account:", error);
      throw error;
    }
  }

  /**
   * Update account balance (internal use only)
   * This should be called within a transaction
   */
  async updateAccountBalance(
    accountId: mongoose.Types.ObjectId,
    amount: number,
    session?: mongoose.ClientSession
  ): Promise<IAccount | null> {
    try {
      const account = await Account.findOneAndUpdate(
        { _id: accountId },
        {
          $inc: {
            balance: amount,
            availableBalance: amount,
          },
        },
        { new: true, session }
      );

      return account;
    } catch (error) {
      logger.error("Error updating account balance:", error);
      throw error;
    }
  }

  /**
   * Close account with transaction support
   * Private helper method
   */
  private async closeAccountWithTransaction(
    accountId: string,
    userId: mongoose.Types.ObjectId
  ): Promise<IAccount | null> {
    // Start a session
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Get account
      const account = await Account.findOne({ _id: accountId, userId }).session(
        session
      );

      if (!account) {
        throw new Error("Account not found");
      }

      // Check if account has zero balance
      if (account.balance !== 0) {
        throw new Error("Account must have zero balance to be closed");
      }

      // Update account status
      account.status = AccountStatus.CLOSED;
      await account.save({ session });

      // Commit transaction
      await session.commitTransaction();

      return account;
    } catch (error) {
      // Abort transaction on error
      await session.abortTransaction();
      throw error;
    } finally {
      // End session
      session.endSession();
    }
  }

  /**
   * Close account without transaction support
   * Fallback method for development environments
   * Private helper method
   */
  private async closeAccountWithoutTransaction(
    accountId: string,
    userId: mongoose.Types.ObjectId
  ): Promise<IAccount | null> {
    // Get account
    const account = await Account.findOne({ _id: accountId, userId });

    if (!account) {
      throw new Error("Account not found");
    }

    // Check if account has zero balance
    if (account.balance !== 0) {
      throw new Error("Account must have zero balance to be closed");
    }

    // Update account status
    account.status = AccountStatus.CLOSED;
    await account.save();

    return account;
  }

  /**
   * Close account
   */
  async closeAccount(
    accountId: string,
    userId: mongoose.Types.ObjectId
  ): Promise<IAccount | null> {
    try {
      // Check if transactions are supported
      if (useTransactions) {
        // With transaction support
        return await this.closeAccountWithTransaction(accountId, userId);
      } else {
        // Without transaction support (fallback for development)
        return await this.closeAccountWithoutTransaction(accountId, userId);
      }
    } catch (error) {
      logger.error("Error closing account:", error);
      throw error;
    }
  }
}

export default new AccountService();
