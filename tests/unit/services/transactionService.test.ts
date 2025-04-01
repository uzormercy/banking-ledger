import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import transactionService from "../../../src/services/transactionService";
import accountService from "../../../src/services/accountService";
import Account, { AccountType } from "../../../src/models/account";
import Transaction, {
  TransactionStatus,
  TransactionType,
} from "../../../src/models/transaction";
import LedgerEntry, { EntryType } from "../../../src/models/ledgerEntry";
import User, { IUser } from "../../../src/models/user";

let mongoServer: MongoMemoryServer;
let testUser: IUser & { _id: mongoose.Types.ObjectId };
let sourceAccount: any;
let destinationAccount: any;

beforeAll(async () => {
  // Create in-memory MongoDB server
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();

  // Connect to the in-memory database
  await mongoose.connect(uri);

  // Create a test user
  testUser = new User({
    email: "test@example.com",
    password: "password123",
    firstName: "Test",
    lastName: "User",
  });

  await testUser.save();
});

afterAll(async () => {
  // Disconnect from the database
  await mongoose.disconnect();

  // Stop in-memory MongoDB server
  await mongoServer.stop();
});

beforeEach(async () => {
  // Clear collections before each test
  await Transaction.deleteMany({});
  await LedgerEntry.deleteMany({});
  await Account.deleteMany({});

  // Create test accounts
  sourceAccount = await accountService.createAccount({
    userId: testUser._id,
    name: "Source Account",
    type: AccountType.ASSET,
    currency: "USD",
    initialBalance: 1000,
  });

  destinationAccount = await accountService.createAccount({
    userId: testUser._id,
    name: "Destination Account",
    type: AccountType.ASSET,
    currency: "USD",
    initialBalance: 0,
  });
});

describe("Transaction Service", () => {
  describe("deposit", () => {
    it("should process a deposit transaction successfully", async () => {
      const depositData = {
        userId: testUser._id,
        accountId: destinationAccount._id,
        amount: 500,
        currency: "USD",
        description: "Test deposit",
      };

      const initialBalance = destinationAccount.balance;
      const transaction = await transactionService.deposit(depositData);

      // Reload account to get updated balance
      const updatedAccount = await Account.findById(destinationAccount._id);

      // Check transaction
      expect(transaction).toBeDefined();
      expect(transaction.type).toBe(TransactionType.DEPOSIT);
      expect(transaction.amount).toBe(500);
      expect(transaction.status).toBe(TransactionStatus.COMPLETED);

      // Check account balance updated
      expect(updatedAccount?.balance).toBe(initialBalance + 500);

      // Check ledger entry created
      const ledgerEntry = await LedgerEntry.findOne({
        transactionId: transaction._id,
      });
      expect(ledgerEntry).toBeDefined();
      expect(ledgerEntry?.type).toBe(EntryType.DEBIT);
      expect(ledgerEntry?.amount).toBe(500);
    });

    it("should throw an error when account not found", async () => {
      const depositData = {
        userId: testUser._id,
        accountId: new mongoose.Types.ObjectId(),
        amount: 500,
        currency: "USD",
        description: "Test deposit",
      };

      await expect(transactionService.deposit(depositData)).rejects.toThrow(
        "Account not found"
      );
    });

    it("should throw an error when currency mismatch", async () => {
      const depositData = {
        userId: testUser._id,
        accountId: destinationAccount._id,
        amount: 500,
        currency: "EUR", // Account is in USD
        description: "Test deposit",
      };

      await expect(transactionService.deposit(depositData)).rejects.toThrow(
        "Currency mismatch"
      );
    });
  });

  describe("withdraw", () => {
    it("should process a withdrawal transaction successfully", async () => {
      const withdrawalData = {
        userId: testUser._id,
        accountId: sourceAccount._id,
        amount: 300,
        currency: "USD",
        description: "Test withdrawal",
      };

      const initialBalance = sourceAccount.balance;
      const transaction = await transactionService.withdraw(withdrawalData);

      // Reload account to get updated balance
      const updatedAccount = await Account.findById(sourceAccount._id);

      // Check transaction
      expect(transaction).toBeDefined();
      expect(transaction.type).toBe(TransactionType.WITHDRAWAL);
      expect(transaction.amount).toBe(300);
      expect(transaction.status).toBe(TransactionStatus.COMPLETED);

      // Check account balance updated
      expect(updatedAccount?.balance).toBe(initialBalance - 300);

      // Check ledger entry created
      const ledgerEntry = await LedgerEntry.findOne({
        transactionId: transaction._id,
      });
      expect(ledgerEntry).toBeDefined();
      expect(ledgerEntry?.type).toBe(EntryType.CREDIT);
      expect(ledgerEntry?.amount).toBe(300);
    });

    it("should throw an error when insufficient funds", async () => {
      const withdrawalData = {
        userId: testUser._id,
        accountId: sourceAccount._id,
        amount: 2000, // More than available balance
        currency: "USD",
        description: "Test withdrawal",
      };

      await expect(transactionService.withdraw(withdrawalData)).rejects.toThrow(
        "Insufficient funds"
      );
    });
  });

  describe("transfer", () => {
    it("should process a transfer transaction successfully", async () => {
      const transferData = {
        userId: testUser._id,
        sourceAccountId: sourceAccount._id,
        destinationAccountId: destinationAccount._id,
        amount: 500,
        currency: "USD",
        description: "Test transfer",
      };

      const sourceInitialBalance = sourceAccount.balance;
      const destInitialBalance = destinationAccount.balance;

      const transaction = await transactionService.transfer(transferData);

      // Reload accounts to get updated balances
      const updatedSourceAccount = await Account.findById(sourceAccount._id);
      const updatedDestAccount = await Account.findById(destinationAccount._id);

      // Check transaction
      expect(transaction).toBeDefined();
      expect(transaction.type).toBe(TransactionType.TRANSFER);
      expect(transaction.amount).toBe(500);
      expect(transaction.status).toBe(TransactionStatus.COMPLETED);

      // Check account balances updated
      expect(updatedSourceAccount?.balance).toBe(sourceInitialBalance - 500);
      expect(updatedDestAccount?.balance).toBe(destInitialBalance + 500);

      // Check ledger entries created
      const ledgerEntries = await LedgerEntry.find({
        transactionId: transaction._id,
      }).sort({ type: 1 });
      expect(ledgerEntries.length).toBe(2);

      // Credit entry for source account
      expect(ledgerEntries[0].accountId.toString()).toBe(
        sourceAccount._id.toString()
      );
      expect(ledgerEntries[0].type).toBe(EntryType.CREDIT);
      expect(ledgerEntries[0].amount).toBe(500);

      // Debit entry for destination account
      expect(ledgerEntries[1].accountId.toString()).toBe(
        destinationAccount._id.toString()
      );
      expect(ledgerEntries[1].type).toBe(EntryType.DEBIT);
      expect(ledgerEntries[1].amount).toBe(500);
    });

    it("should throw an error when insufficient funds for transfer", async () => {
      const transferData = {
        userId: testUser._id,
        sourceAccountId: sourceAccount._id,
        destinationAccountId: destinationAccount._id,
        amount: 2000, // More than available balance
        currency: "USD",
        description: "Test transfer",
      };

      await expect(transactionService.transfer(transferData)).rejects.toThrow(
        "Insufficient funds"
      );
    });

    it("should throw an error when source account not found", async () => {
      const transferData = {
        userId: testUser._id,
        sourceAccountId: new mongoose.Types.ObjectId(),
        destinationAccountId: destinationAccount._id,
        amount: 500,
        currency: "USD",
        description: "Test transfer",
      };

      await expect(transactionService.transfer(transferData)).rejects.toThrow(
        "Source account not found"
      );
    });

    it("should throw an error when destination account not found", async () => {
      const transferData = {
        userId: testUser._id,
        sourceAccountId: sourceAccount._id,
        destinationAccountId: new mongoose.Types.ObjectId(),
        amount: 500,
        currency: "USD",
        description: "Test transfer",
      };

      await expect(transactionService.transfer(transferData)).rejects.toThrow(
        "Destination account not found"
      );
    });
  });

  describe("getTransactions", () => {
    it("should get transactions with pagination", async () => {
      // Create multiple transactions
      await transactionService.deposit({
        userId: testUser._id,
        accountId: destinationAccount._id,
        amount: 100,
        currency: "USD",
        description: "Deposit 1",
      });

      await transactionService.deposit({
        userId: testUser._id,
        accountId: destinationAccount._id,
        amount: 200,
        currency: "USD",
        description: "Deposit 2",
      });

      await transactionService.withdraw({
        userId: testUser._id,
        accountId: sourceAccount._id,
        amount: 50,
        currency: "USD",
        description: "Withdrawal 1",
      });

      const result = await transactionService.getTransactions({
        userId: testUser._id,
        page: 1,
        limit: 10,
      });

      expect(result.transactions.length).toBe(3);
      expect(result.total).toBe(3);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
    });

    it("should filter transactions by account", async () => {
      // Create multiple transactions for different accounts
      await transactionService.deposit({
        userId: testUser._id,
        accountId: destinationAccount._id,
        amount: 100,
        currency: "USD",
        description: "Deposit to destination",
      });

      await transactionService.withdraw({
        userId: testUser._id,
        accountId: sourceAccount._id,
        amount: 50,
        currency: "USD",
        description: "Withdrawal from source",
      });

      const result = await transactionService.getTransactions({
        userId: testUser._id,
        accountId: destinationAccount._id,
        page: 1,
        limit: 10,
      });

      expect(result.transactions.length).toBe(1);
      expect(result.transactions[0].description).toBe("Deposit to destination");
    });
  });
});
