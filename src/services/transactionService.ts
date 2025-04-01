import mongoose from "mongoose";
import Account from "../models/account";
import Transaction, {
  ITransaction,
  TransactionStatus,
  TransactionType,
} from "../models/transaction";
import LedgerEntry, { ILedgerEntry, EntryType } from "../models/ledgerEntry";
import { generateTransactionId } from "../utils/helpers";
import { logger } from "../utils/logger";
import { useTransactions } from "../config/database";

interface DepositInput {
  userId: mongoose.Types.ObjectId;
  accountId: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  description: string;
  metadata?: Record<string, any>;
}

interface WithdrawalInput {
  userId: mongoose.Types.ObjectId;
  accountId: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  description: string;
  metadata?: Record<string, any>;
}

interface TransferInput {
  userId: mongoose.Types.ObjectId;
  sourceAccountId: mongoose.Types.ObjectId;
  destinationAccountId: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  description: string;
  metadata?: Record<string, any>;
}

interface TransactionQueryInput {
  userId: mongoose.Types.ObjectId;
  accountId?: mongoose.Types.ObjectId;
  type?: TransactionType;
  startDate?: Date;
  endDate?: Date;
  page: number;
  limit: number;
}

class TransactionService {
  /**
   * Process a deposit transaction
   * Deposit transactions are represented by:
   * - DEBIT to user's account (asset increase)
   * - CREDIT to bank's liability account (liability increase)
   */
  async deposit(depositData: DepositInput): Promise<ITransaction> {
    try {
      // Check if transactions are supported
      if (useTransactions) {
        return await this.depositWithTransaction(depositData);
      } else {
        return await this.depositWithoutTransaction(depositData);
      }
    } catch (error) {
      logger.error("Deposit error:", error);
      throw error;
    }
  }

  /**
   * Process a deposit with transaction support
   * Private helper method
   */
  private async depositWithTransaction(
    depositData: DepositInput
  ): Promise<ITransaction> {
    // Start a session for transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Get destination account and check if it exists and has matching currency
      const account = await Account.findOne({
        _id: depositData.accountId,
        userId: depositData.userId,
      }).session(session);

      if (!account) {
        throw new Error("Account not found");
      }

      if (account.currency !== depositData.currency) {
        throw new Error("Currency mismatch");
      }

      // Create transaction
      const transactionId = generateTransactionId();
      const transaction = new Transaction({
        transactionId,
        userId: depositData.userId,
        type: TransactionType.DEPOSIT,
        amount: depositData.amount,
        currency: depositData.currency,
        destinationAccountId: depositData.accountId,
        description: depositData.description,
        status: TransactionStatus.PENDING,
        metadata: depositData.metadata || {},
      });

      await transaction.save({ session });

      // Update account balance - For double-entry accounting
      // Debit the user's account (increase asset)
      await this.createLedgerEntry(
        transaction._id,
        depositData.accountId,
        EntryType.DEBIT,
        depositData.amount,
        depositData.currency,
        account.balance + depositData.amount,
        `Deposit: ${depositData.description}`,
        session
      );

      // Update account balance
      account.balance += depositData.amount;
      account.availableBalance += depositData.amount;
      await account.save({ session });

      // Update transaction status
      transaction.status = TransactionStatus.COMPLETED;
      transaction.completedAt = new Date();
      await transaction.save({ session });

      // Commit transaction
      await session.commitTransaction();

      return transaction;
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
   * Process a deposit without transaction support
   * Fallback method for development environments
   * Private helper method
   */
  private async depositWithoutTransaction(
    depositData: DepositInput
  ): Promise<ITransaction> {
    // Get destination account and check if it exists and has matching currency
    const account = await Account.findOne({
      _id: depositData.accountId,
      userId: depositData.userId,
    });

    if (!account) {
      throw new Error("Account not found");
    }

    if (account.currency !== depositData.currency) {
      throw new Error("Currency mismatch");
    }

    // Create transaction
    const transactionId = generateTransactionId();
    const transaction = new Transaction({
      transactionId,
      userId: depositData.userId,
      type: TransactionType.DEPOSIT,
      amount: depositData.amount,
      currency: depositData.currency,
      destinationAccountId: depositData.accountId,
      description: depositData.description,
      status: TransactionStatus.PENDING,
      metadata: depositData.metadata || {},
    });

    await transaction.save();

    // Update account balance - For double-entry accounting
    // Debit the user's account (increase asset)
    await this.createLedgerEntryWithoutTransaction(
      transaction._id,
      depositData.accountId,
      EntryType.DEBIT,
      depositData.amount,
      depositData.currency,
      account.balance + depositData.amount,
      `Deposit: ${depositData.description}`
    );

    // Update account balance
    account.balance += depositData.amount;
    account.availableBalance += depositData.amount;
    await account.save();

    // Update transaction status
    transaction.status = TransactionStatus.COMPLETED;
    transaction.completedAt = new Date();
    await transaction.save();

    return transaction;
  }

  /**
   * Create a ledger entry without transaction session
   */
  private async createLedgerEntryWithoutTransaction(
    transactionId: mongoose.Types.ObjectId,
    accountId: mongoose.Types.ObjectId,
    type: EntryType,
    amount: number,
    currency: string,
    balance: number,
    description: string
  ): Promise<ILedgerEntry> {
    const entry = new LedgerEntry({
      transactionId,
      accountId,
      type,
      amount,
      currency,
      balance,
      description,
    });

    await entry.save();
    return entry;
  }

  /**
   * Process a withdrawal transaction
   * Withdrawal transactions are represented by:
   * - CREDIT to user's account (asset decrease)
   * - DEBIT to bank's liability account (liability decrease)
   */
  async withdraw(withdrawalData: WithdrawalInput): Promise<ITransaction> {
    // Start a session for transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Get source account and check if it exists and has matching currency
      const account = await Account.findOne({
        _id: withdrawalData.accountId,
        userId: withdrawalData.userId,
      }).session(session);

      if (!account) {
        throw new Error("Account not found");
      }

      if (account.currency !== withdrawalData.currency) {
        throw new Error("Currency mismatch");
      }

      // Check if account has sufficient balance
      if (account.availableBalance < withdrawalData.amount) {
        throw new Error("Insufficient funds");
      }

      // Create transaction
      const transactionId = generateTransactionId();
      const transaction = new Transaction({
        transactionId,
        userId: withdrawalData.userId,
        type: TransactionType.WITHDRAWAL,
        amount: withdrawalData.amount,
        currency: withdrawalData.currency,
        sourceAccountId: withdrawalData.accountId,
        description: withdrawalData.description,
        status: TransactionStatus.PENDING,
        metadata: withdrawalData.metadata || {},
      });

      await transaction.save({ session });

      // Update account balance - For double-entry accounting
      // Credit the user's account (decrease asset)
      await this.createLedgerEntry(
        transaction._id,
        withdrawalData.accountId,
        EntryType.CREDIT,
        withdrawalData.amount,
        withdrawalData.currency,
        account.balance - withdrawalData.amount,
        `Withdrawal: ${withdrawalData.description}`,
        session
      );

      // Debit the bank's liability account (decrease liability)
      // In a real system, you would create and use a separate bank liability account
      // For simplicity, we're simulating this part

      // Update account balance
      account.balance -= withdrawalData.amount;
      account.availableBalance -= withdrawalData.amount;
      await account.save({ session });

      // Update transaction status
      transaction.status = TransactionStatus.COMPLETED;
      transaction.completedAt = new Date();
      await transaction.save({ session });

      // Commit transaction
      await session.commitTransaction();

      return transaction;
    } catch (error) {
      // Abort transaction on error
      await session.abortTransaction();
      logger.error("Withdrawal error:", error);
      throw error;
    } finally {
      // End session
      session.endSession();
    }
  }

  /**
   * Process a transfer transaction
   * Transfer transactions are represented by:
   * - CREDIT to source account (asset decrease)
   * - DEBIT to destination account (asset increase)
   */
  async transfer(transferData: TransferInput): Promise<ITransaction> {
    // Start a session for transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Get source account
      const sourceAccount = await Account.findOne({
        _id: transferData.sourceAccountId,
        userId: transferData.userId,
      }).session(session);

      if (!sourceAccount) {
        throw new Error("Source account not found");
      }

      // Get destination account
      const destinationAccount = await Account.findOne({
        _id: transferData.destinationAccountId,
      }).session(session);

      if (!destinationAccount) {
        throw new Error("Destination account not found");
      }

      // Check currencies
      if (sourceAccount.currency !== transferData.currency) {
        throw new Error("Source account currency mismatch");
      }

      if (destinationAccount.currency !== transferData.currency) {
        throw new Error("Destination account currency mismatch");
      }

      // Check if source account has sufficient balance
      if (sourceAccount.availableBalance < transferData.amount) {
        throw new Error("Insufficient funds");
      }

      // Create transaction
      const transactionId = generateTransactionId();
      const transaction = new Transaction({
        transactionId,
        userId: transferData.userId,
        type: TransactionType.TRANSFER,
        amount: transferData.amount,
        currency: transferData.currency,
        sourceAccountId: transferData.sourceAccountId,
        destinationAccountId: transferData.destinationAccountId,
        description: transferData.description,
        status: TransactionStatus.PENDING,
        metadata: transferData.metadata || {},
      });

      await transaction.save({ session });

      // Update account balances - For double-entry accounting
      // Credit the source account (decrease asset)
      await this.createLedgerEntry(
        transaction._id,
        transferData.sourceAccountId,
        EntryType.CREDIT,
        transferData.amount,
        transferData.currency,
        sourceAccount.balance - transferData.amount,
        `Transfer Out: ${transferData.description}`,
        session
      );

      // Debit the destination account (increase asset)
      await this.createLedgerEntry(
        transaction._id,
        transferData.destinationAccountId,
        EntryType.DEBIT,
        transferData.amount,
        transferData.currency,
        destinationAccount.balance + transferData.amount,
        `Transfer In: ${transferData.description}`,
        session
      );

      // Update source account balance
      sourceAccount.balance -= transferData.amount;
      sourceAccount.availableBalance -= transferData.amount;
      await sourceAccount.save({ session });

      // Update destination account balance
      destinationAccount.balance += transferData.amount;
      destinationAccount.availableBalance += transferData.amount;
      await destinationAccount.save({ session });

      // Update transaction status
      transaction.status = TransactionStatus.COMPLETED;
      transaction.completedAt = new Date();
      await transaction.save({ session });

      // Commit transaction
      await session.commitTransaction();

      return transaction;
    } catch (error) {
      // Abort transaction on error
      await session.abortTransaction();
      logger.error("Transfer error:", error);
      throw error;
    } finally {
      // End session
      session.endSession();
    }
  }

  /**
   * Get transaction by ID
   */
  async getTransactionById(
    transactionId: string,
    userId: mongoose.Types.ObjectId
  ): Promise<ITransaction | null> {
    try {
      return await Transaction.findOne({
        _id: transactionId,
        userId,
      });
    } catch (error) {
      logger.error("Get transaction error:", error);
      throw error;
    }
  }

  /**
   * Get transactions with pagination
   */
  async getTransactions(queryParams: TransactionQueryInput): Promise<{
    transactions: ITransaction[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const { userId, accountId, type, startDate, endDate, page, limit } =
        queryParams;

      // Build query
      const query: any = { userId };

      if (accountId) {
        query.$or = [
          { sourceAccountId: accountId },
          { destinationAccountId: accountId },
        ];
      }

      if (type) {
        query.type = type;
      }

      if (startDate || endDate) {
        query.createdAt = {};

        if (startDate) {
          query.createdAt.$gte = startDate;
        }

        if (endDate) {
          query.createdAt.$lte = endDate;
        }
      }

      // Get total count
      const total = await Transaction.countDocuments(query);

      // Get transactions with pagination
      const transactions = await Transaction.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec();

      // Calculate total pages
      const totalPages = Math.ceil(total / limit);

      return {
        transactions,
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      logger.error("Get transactions error:", error);
      throw error;
    }
  }

  /**
   * Get ledger entries for an account
   */
  async getLedgerEntries(
    accountId: mongoose.Types.ObjectId,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    entries: ILedgerEntry[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      // Get total count
      const total = await LedgerEntry.countDocuments({ accountId });

      // Get ledger entries with pagination
      const entries = await LedgerEntry.find({ accountId })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec();

      // Calculate total pages
      const totalPages = Math.ceil(total / limit);

      return {
        entries,
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      logger.error("Get ledger entries error:", error);
      throw error;
    }
  }

  /**
   * Create a ledger entry
   * This is a private method used within the transaction processing
   */
  private async createLedgerEntry(
    transactionId: mongoose.Types.ObjectId,
    accountId: mongoose.Types.ObjectId,
    type: EntryType,
    amount: number,
    currency: string,
    balance: number,
    description: string,
    session: mongoose.ClientSession
  ): Promise<ILedgerEntry> {
    const entry = new LedgerEntry({
      transactionId,
      accountId,
      type,
      amount,
      currency,
      balance,
      description,
    });

    await entry.save({ session });
    return entry;
  }
}

export default new TransactionService();
