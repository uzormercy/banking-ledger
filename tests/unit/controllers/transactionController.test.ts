import { Response } from "express";
import mongoose from "mongoose";
import { AuthRequest } from "../../../src/middleware/auth";
import transactionController from "../../../src/controllers/transactionController";
import transactionService from "../../../src/services/transactionService";
import {
  validateDepositInput,
  validateWithdrawalInput,
  validateTransferInput,
  validateTransactionQueryInput,
} from "../../../src/utils/validators";
import {
  TransactionType,
  TransactionStatus,
} from "../../../src/models/transaction";
import { getPaginationMetadata } from "../../../src/utils/helpers";

// Mock dependencies
jest.mock("../../../src/services/transactionService");
jest.mock("../../../src/utils/validators");
jest.mock("../../../src/utils/helpers");
jest.mock("../../../src/utils/logger");
jest.mock("mongoose");

describe("Transaction Controller", () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let responseObject: any = {};

  // Mock user
  const mockUser = {
    _id: new mongoose.Types.ObjectId("507f1f77bcf86cd799439011"),
    email: "test@example.com",
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup request and response
    mockRequest = {
      body: {},
      params: {},
      query: {},
      user: mockUser,
    };

    responseObject = {
      statusCode: 0,
      jsonObject: {},
    };

    mockResponse = {
      status: jest.fn().mockImplementation((code) => {
        responseObject.statusCode = code;
        return mockResponse;
      }),
      json: jest.fn().mockImplementation((data) => {
        responseObject.jsonObject = data;
        return mockResponse;
      }),
    };

    // Mock mongoose.Types.ObjectId.isValid to always return true by default
    (mongoose.Types.ObjectId.isValid as jest.Mock).mockReturnValue(true);
  });

  describe("deposit", () => {
    it("should process a deposit successfully", async () => {
      // Mock data
      const depositData = {
        accountId: "507f1f77bcf86cd799439012",
        amount: 500,
        currency: "USD",
        description: "Test deposit",
      };

      const serviceResponse = {
        _id: new mongoose.Types.ObjectId("507f1f77bcf86cd799439014"),
        transactionId: "tx-123456",
        userId: mockUser._id,
        type: TransactionType.DEPOSIT,
        amount: depositData.amount,
        currency: depositData.currency,
        description: depositData.description,
        status: TransactionStatus.COMPLETED,
        // Other transaction fields
      };

      // Setup mocks
      mockRequest.body = depositData;
      (validateDepositInput as jest.Mock).mockReturnValue({ error: null });
      (transactionService.deposit as jest.Mock).mockResolvedValue(
        serviceResponse
      );

      // Call controller
      await transactionController.deposit(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      // Assertions
      expect(validateDepositInput).toHaveBeenCalledWith(depositData);
      expect(mongoose.Types.ObjectId.isValid).toHaveBeenCalledWith(
        depositData.accountId
      );
      expect(transactionService.deposit).toHaveBeenCalledWith({
        userId: mockUser._id,
        accountId: expect.any(mongoose.Types.ObjectId),
        amount: depositData.amount,
        currency: depositData.currency,
        description: depositData.description,
        metadata: undefined,
      });
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(serviceResponse);
    });

    it("should return 400 if validation fails", async () => {
      // Mock validation error
      const validationError = {
        details: [{ message: "Amount must be positive" }],
      };
      (validateDepositInput as jest.Mock).mockReturnValue({
        error: validationError,
      });

      // Call controller
      await transactionController.deposit(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      // Assertions
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Amount must be positive",
      });
      expect(transactionService.deposit).not.toHaveBeenCalled();
    });

    it("should return 400 for invalid account ID format", async () => {
      // Setup mocks
      mockRequest.body = {
        accountId: "invalid-id",
        amount: 500,
        currency: "USD",
        description: "Test deposit",
      };
      (validateDepositInput as jest.Mock).mockReturnValue({ error: null });
      (mongoose.Types.ObjectId.isValid as jest.Mock).mockReturnValue(false);

      // Call controller
      await transactionController.deposit(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      // Assertions
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Invalid account ID format",
      });
      expect(transactionService.deposit).not.toHaveBeenCalled();
    });

    it("should return 404 when account not found", async () => {
      // Setup mocks
      mockRequest.body = {
        accountId: "507f1f77bcf86cd799439012",
        amount: 500,
        currency: "USD",
        description: "Test deposit",
      };
      (validateDepositInput as jest.Mock).mockReturnValue({ error: null });
      (transactionService.deposit as jest.Mock).mockRejectedValue(
        new Error("Account not found")
      );

      // Call controller
      await transactionController.deposit(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      // Assertions
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Account not found",
      });
    });

    it("should return 400 when currency mismatch", async () => {
      // Setup mocks
      mockRequest.body = {
        accountId: "507f1f77bcf86cd799439012",
        amount: 500,
        currency: "EUR",
        description: "Test deposit",
      };
      (validateDepositInput as jest.Mock).mockReturnValue({ error: null });
      (transactionService.deposit as jest.Mock).mockRejectedValue(
        new Error("Currency mismatch")
      );

      // Call controller
      await transactionController.deposit(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      // Assertions
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Currency mismatch",
      });
    });

    it("should return 500 for unexpected errors", async () => {
      // Setup mocks
      mockRequest.body = {
        accountId: "507f1f77bcf86cd799439012",
        amount: 500,
        currency: "USD",
        description: "Test deposit",
      };
      (validateDepositInput as jest.Mock).mockReturnValue({ error: null });
      (transactionService.deposit as jest.Mock).mockRejectedValue(
        new Error("Database error")
      );

      // Call controller
      await transactionController.deposit(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      // Assertions
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "An error occurred while processing the deposit.",
      });
    });
  });

  describe("withdraw", () => {
    it("should process a withdrawal successfully", async () => {
      // Mock data
      const withdrawalData = {
        accountId: "507f1f77bcf86cd799439012",
        amount: 200,
        currency: "USD",
        description: "Test withdrawal",
      };

      const serviceResponse = {
        _id: new mongoose.Types.ObjectId("507f1f77bcf86cd799439015"),
        transactionId: "tx-123457",
        userId: mockUser._id,
        type: TransactionType.WITHDRAWAL,
        amount: withdrawalData.amount,
        currency: withdrawalData.currency,
        description: withdrawalData.description,
        status: TransactionStatus.COMPLETED,
        // Other transaction fields
      };

      // Setup mocks
      mockRequest.body = withdrawalData;
      (validateWithdrawalInput as jest.Mock).mockReturnValue({ error: null });
      (transactionService.withdraw as jest.Mock).mockResolvedValue(
        serviceResponse
      );

      // Call controller
      await transactionController.withdraw(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      // Assertions
      expect(validateWithdrawalInput).toHaveBeenCalledWith(withdrawalData);
      expect(mongoose.Types.ObjectId.isValid).toHaveBeenCalledWith(
        withdrawalData.accountId
      );
      expect(transactionService.withdraw).toHaveBeenCalledWith({
        userId: mockUser._id,
        accountId: expect.any(mongoose.Types.ObjectId),
        amount: withdrawalData.amount,
        currency: withdrawalData.currency,
        description: withdrawalData.description,
        metadata: undefined,
      });
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(serviceResponse);
    });

    it("should return 400 when insufficient funds", async () => {
      // Setup mocks
      mockRequest.body = {
        accountId: "507f1f77bcf86cd799439012",
        amount: 2000,
        currency: "USD",
        description: "Test withdrawal",
      };
      (validateWithdrawalInput as jest.Mock).mockReturnValue({ error: null });
      (transactionService.withdraw as jest.Mock).mockRejectedValue(
        new Error("Insufficient funds")
      );

      // Call controller
      await transactionController.withdraw(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      // Assertions
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Insufficient funds",
      });
    });
  });

  describe("transfer", () => {
    it("should process a transfer successfully", async () => {
      // Mock data
      const transferData = {
        sourceAccountId: "507f1f77bcf86cd799439012",
        destinationAccountId: "507f1f77bcf86cd799439013",
        amount: 300,
        currency: "USD",
        description: "Test transfer",
      };

      const serviceResponse = {
        _id: new mongoose.Types.ObjectId("507f1f77bcf86cd799439016"),
        transactionId: "tx-123458",
        userId: mockUser._id,
        type: TransactionType.TRANSFER,
        amount: transferData.amount,
        currency: transferData.currency,
        description: transferData.description,
        status: TransactionStatus.COMPLETED,
        // Other transaction fields
      };

      // Setup mocks
      mockRequest.body = transferData;
      (validateTransferInput as jest.Mock).mockReturnValue({ error: null });
      (transactionService.transfer as jest.Mock).mockResolvedValue(
        serviceResponse
      );

      // Call controller
      await transactionController.transfer(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      // Assertions
      expect(validateTransferInput).toHaveBeenCalledWith(transferData);
      expect(mongoose.Types.ObjectId.isValid).toHaveBeenCalledWith(
        transferData.sourceAccountId
      );
      expect(mongoose.Types.ObjectId.isValid).toHaveBeenCalledWith(
        transferData.destinationAccountId
      );
      expect(transactionService.transfer).toHaveBeenCalledWith({
        userId: mockUser._id,
        sourceAccountId: expect.any(mongoose.Types.ObjectId),
        destinationAccountId: expect.any(mongoose.Types.ObjectId),
        amount: transferData.amount,
        currency: transferData.currency,
        description: transferData.description,
        metadata: undefined,
      });
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(serviceResponse);
    });

    it("should return 404 when source account not found", async () => {
      // Setup mocks
      mockRequest.body = {
        sourceAccountId: "507f1f77bcf86cd799439012",
        destinationAccountId: "507f1f77bcf86cd799439013",
        amount: 300,
        currency: "USD",
        description: "Test transfer",
      };
      (validateTransferInput as jest.Mock).mockReturnValue({ error: null });
      (transactionService.transfer as jest.Mock).mockRejectedValue(
        new Error("Source account not found")
      );

      // Call controller
      await transactionController.transfer(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      // Assertions
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Source account not found",
      });
    });
  });

  describe("getTransaction", () => {
    it("should get a transaction by ID successfully", async () => {
      // Mock data
      const transactionId = "507f1f77bcf86cd799439016";

      const serviceResponse = {
        _id: new mongoose.Types.ObjectId(transactionId),
        transactionId: "tx-123458",
        userId: mockUser._id,
        type: TransactionType.TRANSFER,
        amount: 300,
        currency: "USD",
        description: "Test transaction",
        status: TransactionStatus.COMPLETED,
        // Other transaction fields
      };

      // Setup mocks
      mockRequest.params = { id: transactionId };
      (transactionService.getTransactionById as jest.Mock).mockResolvedValue(
        serviceResponse
      );

      // Call controller
      await transactionController.getTransaction(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      // Assertions
      expect(mongoose.Types.ObjectId.isValid).toHaveBeenCalledWith(
        transactionId
      );
      expect(transactionService.getTransactionById).toHaveBeenCalledWith(
        transactionId,
        mockUser._id
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(serviceResponse);
    });

    it("should return 404 when transaction not found", async () => {
      // Setup mocks
      mockRequest.params = { id: "507f1f77bcf86cd799439016" };
      (transactionService.getTransactionById as jest.Mock).mockResolvedValue(
        null
      );

      // Call controller
      await transactionController.getTransaction(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      // Assertions
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Transaction not found",
      });
    });
  });

  describe("getTransactions", () => {
    it("should get transactions with pagination successfully", async () => {
      // Mock data
      const queryParams = {
        page: "1",
        limit: "10",
      };

      const serviceResponse = {
        transactions: [
          {
            _id: new mongoose.Types.ObjectId("507f1f77bcf86cd799439014"),
            transactionId: "tx-123456",
            type: TransactionType.DEPOSIT,
            // Other transaction fields
          },
          {
            _id: new mongoose.Types.ObjectId("507f1f77bcf86cd799439015"),
            transactionId: "tx-123457",
            type: TransactionType.WITHDRAWAL,
            // Other transaction fields
          },
        ],
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      const paginationMetadata = {
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      };

      // Setup mocks
      mockRequest.query = queryParams;
      (validateTransactionQueryInput as jest.Mock).mockReturnValue({
        error: null,
      });
      (transactionService.getTransactions as jest.Mock).mockResolvedValue(
        serviceResponse
      );
      (getPaginationMetadata as jest.Mock).mockReturnValue(paginationMetadata);

      // Call controller
      await transactionController.getTransactions(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      // Assertions
      expect(validateTransactionQueryInput).toHaveBeenCalledWith(queryParams);
      expect(transactionService.getTransactions).toHaveBeenCalledWith({
        userId: mockUser._id,
        page: 1,
        limit: 10,
      });
      expect(getPaginationMetadata).toHaveBeenCalledWith(1, 10, 2);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        transactions: serviceResponse.transactions,
        pagination: paginationMetadata,
      });
    });

    it("should apply filters when provided", async () => {
      // Setup mocks
      mockRequest.query = {
        page: "1",
        limit: "10",
        accountId: "507f1f77bcf86cd799439012",
        type: "DEPOSIT",
        startDate: "2023-01-01",
        endDate: "2023-12-31",
      };
      (validateTransactionQueryInput as jest.Mock).mockReturnValue({
        error: null,
      });
      (transactionService.getTransactions as jest.Mock).mockResolvedValue({
        transactions: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      });
      (getPaginationMetadata as jest.Mock).mockReturnValue({});

      // Call controller
      await transactionController.getTransactions(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      // Assertions
      expect(transactionService.getTransactions).toHaveBeenCalledWith({
        userId: mockUser._id,
        page: 1,
        limit: 10,
        accountId: expect.any(mongoose.Types.ObjectId),
        type: "DEPOSIT",
        startDate: expect.any(Date),
        endDate: expect.any(Date),
      });
    });
  });

  describe("getLedgerEntries", () => {
    it("should get ledger entries for an account successfully", async () => {
      // Mock data
      const accountId = "507f1f77bcf86cd799439012";

      const serviceResponse = {
        entries: [
          {
            _id: new mongoose.Types.ObjectId("507f1f77bcf86cd799439017"),
            // Other ledger entry fields
          },
          {
            _id: new mongoose.Types.ObjectId("507f1f77bcf86cd799439018"),
            // Other ledger entry fields
          },
        ],
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      const paginationMetadata = {
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      };

      // Setup mocks
      mockRequest.params = { accountId };
      mockRequest.query = { page: "1", limit: "20" };
      (transactionService.getLedgerEntries as jest.Mock).mockResolvedValue(
        serviceResponse
      );
      (getPaginationMetadata as jest.Mock).mockReturnValue(paginationMetadata);

      // Call controller
      await transactionController.getLedgerEntries(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      // Assertions
      expect(mongoose.Types.ObjectId.isValid).toHaveBeenCalledWith(accountId);
      expect(transactionService.getLedgerEntries).toHaveBeenCalledWith(
        expect.any(mongoose.Types.ObjectId),
        1,
        20
      );
      expect(getPaginationMetadata).toHaveBeenCalledWith(1, 20, 2);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        entries: serviceResponse.entries,
        pagination: paginationMetadata,
      });
    });

    it("should return 400 for invalid account ID format", async () => {
      // Setup mocks
      mockRequest.params = { accountId: "invalid-id" };
      (mongoose.Types.ObjectId.isValid as jest.Mock).mockReturnValue(false);

      // Call controller
      await transactionController.getLedgerEntries(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      // Assertions
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Invalid account ID format",
      });
      expect(transactionService.getLedgerEntries).not.toHaveBeenCalled();
    });
  });
});
