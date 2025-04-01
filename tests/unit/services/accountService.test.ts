import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import accountService from "../../../src/services/accountService";
import Account, {
  AccountType,
  AccountStatus,
} from "../../../src/models/account";
import User, { IUser } from "../../../src/models/user";

let mongoServer: MongoMemoryServer;
let testUser: IUser & { _id: mongoose.Types.ObjectId };

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
  // Clear accounts collection before each test
  await Account.deleteMany({});
});

describe("Account Service", () => {
  describe("createAccount", () => {
    it("should create a new account with initial balance of 0", async () => {
      const accountData = {
        userId: testUser._id,
        name: "Test Account",
        type: AccountType.ASSET,
        currency: "USD",
      };

      const account = await accountService.createAccount(accountData);

      expect(account).toBeDefined();
      expect(account.name).toBe(accountData.name);
      expect(account.type).toBe(accountData.type);
      expect(account.currency).toBe(accountData.currency);
      expect(account.balance).toBe(0);
      expect(account.availableBalance).toBe(0);
      expect(account.status).toBe(AccountStatus.ACTIVE);
      expect(account.accountNumber).toBeDefined();
    });

    it("should create a new account with specified initial balance", async () => {
      const accountData = {
        userId: testUser._id,
        name: "Test Account with Balance",
        type: AccountType.ASSET,
        currency: "USD",
        initialBalance: 1000,
      };

      const account = await accountService.createAccount(accountData);

      expect(account).toBeDefined();
      expect(account.balance).toBe(1000);
      expect(account.availableBalance).toBe(1000);
    });
  });

  describe("getUserAccounts", () => {
    it("should get all accounts for a user", async () => {
      // Create multiple accounts for the test user
      await accountService.createAccount({
        userId: testUser._id,
        name: "Account 1",
        type: AccountType.ASSET,
        currency: "USD",
      });

      await accountService.createAccount({
        userId: testUser._id,
        name: "Account 2",
        type: AccountType.ASSET,
        currency: "EUR",
      });

      const accounts = await accountService.getUserAccounts(testUser._id);

      expect(accounts).toBeDefined();
      expect(accounts.length).toBe(2);
      expect(accounts[0].name).toBe("Account 2"); // Sorted by createdAt desc
      expect(accounts[1].name).toBe("Account 1");
    });

    it("should filter accounts by currency", async () => {
      // Create multiple accounts with different currencies
      await accountService.createAccount({
        userId: testUser._id,
        name: "USD Account",
        type: AccountType.ASSET,
        currency: "USD",
      });

      await accountService.createAccount({
        userId: testUser._id,
        name: "EUR Account",
        type: AccountType.ASSET,
        currency: "EUR",
      });

      const accounts = await accountService.getUserAccounts(
        testUser._id,
        "USD"
      );

      expect(accounts).toBeDefined();
      expect(accounts.length).toBe(1);
      expect(accounts[0].name).toBe("USD Account");
    });
  });

  describe("updateAccount", () => {
    it("should update account details", async () => {
      // Create an account
      const account = await accountService.createAccount({
        userId: testUser._id,
        name: "Original Name",
        type: AccountType.ASSET,
        currency: "USD",
      });

      // Update account
      const updatedAccount = await accountService.updateAccount(
        account._id.toString(),
        testUser._id,
        { name: "Updated Name" }
      );

      expect(updatedAccount).toBeDefined();
      expect(updatedAccount?.name).toBe("Updated Name");
    });

    it("should return null when account not found", async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      const updatedAccount = await accountService.updateAccount(
        nonExistentId.toString(),
        testUser._id,
        { name: "Updated Name" }
      );

      expect(updatedAccount).toBeNull();
    });
  });

  describe("closeAccount", () => {
    it("should close an account with zero balance", async () => {
      // Create an account with zero balance
      const account = await accountService.createAccount({
        userId: testUser._id,
        name: "Account to Close",
        type: AccountType.ASSET,
        currency: "USD",
        initialBalance: 0,
      });

      const closedAccount = await accountService.closeAccount(
        account._id.toString(),
        testUser._id
      );

      expect(closedAccount).toBeDefined();
      expect(closedAccount?.status).toBe(AccountStatus.CLOSED);
    });

    it("should throw an error when closing an account with non-zero balance", async () => {
      // Create an account with non-zero balance
      const account = await accountService.createAccount({
        userId: testUser._id,
        name: "Account with Balance",
        type: AccountType.ASSET,
        currency: "USD",
        initialBalance: 100,
      });

      await expect(
        accountService.closeAccount(account._id.toString(), testUser._id)
      ).rejects.toThrow("Account must have zero balance to be closed");
    });

    it("should throw an error when account not found", async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      await expect(
        accountService.closeAccount(nonExistentId.toString(), testUser._id)
      ).rejects.toThrow("Account not found");
    });
  });

  describe("getAccountById", () => {
    it("should get account by ID", async () => {
      // Create an account
      const createdAccount = await accountService.createAccount({
        userId: testUser._id,
        name: "Test Account",
        type: AccountType.ASSET,
        currency: "USD",
      });

      const account = await accountService.getAccountById(
        createdAccount._id.toString(),
        testUser._id
      );

      expect(account).toBeDefined();
      expect(account?.name).toBe("Test Account");
    });

    it("should return null when account not found", async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      const account = await accountService.getAccountById(
        nonExistentId.toString(),
        testUser._id
      );

      expect(account).toBeNull();
    });
  });

  describe("getAccountByNumber", () => {
    it("should get account by account number", async () => {
      // Create an account
      const createdAccount = await accountService.createAccount({
        userId: testUser._id,
        name: "Test Account",
        type: AccountType.ASSET,
        currency: "USD",
      });

      const account = await accountService.getAccountByNumber(
        createdAccount.accountNumber
      );

      expect(account).toBeDefined();
      expect(account?.name).toBe("Test Account");
    });

    it("should return null when account not found", async () => {
      const nonExistentNumber = "9999999999";

      const account = await accountService.getAccountByNumber(
        nonExistentNumber
      );

      expect(account).toBeNull();
    });
  });
});
