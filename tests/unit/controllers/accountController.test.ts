import { Response } from "express";
import mongoose from "mongoose";
import { AuthRequest } from "../../../src/middleware/auth";
import accountController from "../../../src/controllers/accountController";
import accountService from "../../../src/services/accountService";
import {
  validateAccountInput,
  validateAccountUpdateInput,
} from "../../../src/utils/validators";
import { AccountType, AccountStatus } from "../../../src/models/account";

// Mock dependencies
jest.mock("../../../src/services/accountService");
jest.mock("../../../src/utils/validators");
jest.mock("../../../src/utils/logger");
jest.mock("mongoose");

describe("Account Controller", () => {
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

  describe("createAccount", () => {
    it("should create an account successfully", async () => {
      // Mock data
      const accountData = {
        name: "Test Account",
        type: AccountType.ASSET,
        currency: "USD",
        initialBalance: 1000,
      };

      const serviceResponse = {
        _id: new mongoose.Types.ObjectId("507f1f77bcf86cd799439012"),
        userId: mockUser._id,
        accountNumber: "1234567890",
        name: accountData.name,
        type: accountData.type,
        currency: accountData.currency,
        balance: accountData.initialBalance,
        availableBalance: accountData.initialBalance,
        status: AccountStatus.ACTIVE,
      };

      // Setup mocks
      mockRequest.body = accountData;
      (validateAccountInput as jest.Mock).mockReturnValue({ error: null });
      (accountService.createAccount as jest.Mock).mockResolvedValue(
        serviceResponse
      );

      // Call controller
      await accountController.createAccount(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      // Assertions
      expect(validateAccountInput).toHaveBeenCalledWith(accountData);
      expect(accountService.createAccount).toHaveBeenCalledWith({
        userId: mockUser._id,
        name: accountData.name,
        type: accountData.type,
        currency: accountData.currency,
        initialBalance: accountData.initialBalance,
        metadata: undefined,
      });
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(serviceResponse);
    });

    it("should return 400 if validation fails", async () => {
      // Mock validation error
      const validationError = { details: [{ message: "Name is required" }] };
      (validateAccountInput as jest.Mock).mockReturnValue({
        error: validationError,
      });

      // Call controller
      await accountController.createAccount(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      // Assertions
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Name is required",
      });
      expect(accountService.createAccount).not.toHaveBeenCalled();
    });

    it("should return 500 for unexpected errors", async () => {
      // Setup mocks
      mockRequest.body = { name: "Test Account" };
      (validateAccountInput as jest.Mock).mockReturnValue({ error: null });
      (accountService.createAccount as jest.Mock).mockRejectedValue(
        new Error("Database error")
      );

      // Call controller
      await accountController.createAccount(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      // Assertions
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "An error occurred while creating the account.",
      });
    });
  });

  describe("getAccount", () => {
    it("should get an account successfully", async () => {
      // Mock data
      const accountId = "507f1f77bcf86cd799439012";
      const serviceResponse = {
        _id: new mongoose.Types.ObjectId(accountId),
        userId: mockUser._id,
        accountNumber: "1234567890",
        name: "Test Account",
        type: AccountType.ASSET,
        currency: "USD",
        balance: 1000,
        availableBalance: 1000,
        status: AccountStatus.ACTIVE,
      };

      // Setup mocks
      mockRequest.params = { id: accountId };
      (accountService.getAccountById as jest.Mock).mockResolvedValue(
        serviceResponse
      );

      // Call controller
      await accountController.getAccount(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      // Assertions
      expect(mongoose.Types.ObjectId.isValid).toHaveBeenCalledWith(accountId);
      expect(accountService.getAccountById).toHaveBeenCalledWith(
        accountId,
        mockUser._id
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(serviceResponse);
    });

    it("should return 400 for invalid account ID format", async () => {
      // Setup mocks
      mockRequest.params = { id: "invalid-id" };
      (mongoose.Types.ObjectId.isValid as jest.Mock).mockReturnValue(false);

      // Call controller
      await accountController.getAccount(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      // Assertions
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Invalid account ID format",
      });
      expect(accountService.getAccountById).not.toHaveBeenCalled();
    });

    it("should return 404 when account not found", async () => {
      // Setup mocks
      mockRequest.params = { id: "507f1f77bcf86cd799439012" };
      (accountService.getAccountById as jest.Mock).mockResolvedValue(null);

      // Call controller
      await accountController.getAccount(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      // Assertions
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Account not found",
      });
    });

    it("should return 500 for unexpected errors", async () => {
      // Setup mocks
      mockRequest.params = { id: "507f1f77bcf86cd799439012" };
      (accountService.getAccountById as jest.Mock).mockRejectedValue(
        new Error("Database error")
      );

      // Call controller
      await accountController.getAccount(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      // Assertions
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "An error occurred while fetching the account.",
      });
    });
  });

  describe("getUserAccounts", () => {
    it("should get all user accounts successfully", async () => {
      // Mock data
      const serviceResponse = [
        {
          _id: new mongoose.Types.ObjectId("507f1f77bcf86cd799439012"),
          userId: mockUser._id,
          accountNumber: "1234567890",
          name: "Account 1",
          type: AccountType.ASSET,
          currency: "USD",
          balance: 1000,
          availableBalance: 1000,
          status: AccountStatus.ACTIVE,
        },
        {
          _id: new mongoose.Types.ObjectId("507f1f77bcf86cd799439013"),
          userId: mockUser._id,
          accountNumber: "0987654321",
          name: "Account 2",
          type: AccountType.ASSET,
          currency: "EUR",
          balance: 500,
          availableBalance: 500,
          status: AccountStatus.ACTIVE,
        },
      ];

      // Setup mocks
      (accountService.getUserAccounts as jest.Mock).mockResolvedValue(
        serviceResponse
      );

      // Call controller
      await accountController.getUserAccounts(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      // Assertions
      expect(accountService.getUserAccounts).toHaveBeenCalledWith(
        mockUser._id,
        undefined
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(serviceResponse);
    });

    it("should filter accounts by currency when provided", async () => {
      // Setup mocks
      mockRequest.query = { currency: "USD" };
      (accountService.getUserAccounts as jest.Mock).mockResolvedValue([]);

      // Call controller
      await accountController.getUserAccounts(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      // Assertions
      expect(accountService.getUserAccounts).toHaveBeenCalledWith(
        mockUser._id,
        "USD"
      );
    });

    it("should return 500 for unexpected errors", async () => {
      // Setup mocks
      (accountService.getUserAccounts as jest.Mock).mockRejectedValue(
        new Error("Database error")
      );

      // Call controller
      await accountController.getUserAccounts(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      // Assertions
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "An error occurred while fetching accounts.",
      });
    });
  });

  describe("updateAccount", () => {
    it("should update an account successfully", async () => {
      // Mock data
      const accountId = "507f1f77bcf86cd799439012";
      const updateData = {
        name: "Updated Account Name",
      };

      const serviceResponse = {
        _id: new mongoose.Types.ObjectId(accountId),
        userId: mockUser._id,
        name: updateData.name,
        // Other account fields
      };

      // Setup mocks
      mockRequest.params = { id: accountId };
      mockRequest.body = updateData;
      (validateAccountUpdateInput as jest.Mock).mockReturnValue({
        error: null,
      });
      (accountService.updateAccount as jest.Mock).mockResolvedValue(
        serviceResponse
      );

      // Call controller
      await accountController.updateAccount(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      // Assertions
      expect(mongoose.Types.ObjectId.isValid).toHaveBeenCalledWith(accountId);
      expect(validateAccountUpdateInput).toHaveBeenCalledWith(updateData);
      expect(accountService.updateAccount).toHaveBeenCalledWith(
        accountId,
        mockUser._id,
        updateData
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(serviceResponse);
    });

    it("should return 400 for invalid account ID format", async () => {
      // Setup mocks
      mockRequest.params = { id: "invalid-id" };
      (mongoose.Types.ObjectId.isValid as jest.Mock).mockReturnValue(false);

      // Call controller
      await accountController.updateAccount(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      // Assertions
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Invalid account ID format",
      });
      expect(accountService.updateAccount).not.toHaveBeenCalled();
    });

    it("should return 400 if validation fails", async () => {
      // Mock validation error
      const validationError = { details: [{ message: "Invalid status" }] };
      mockRequest.params = { id: "507f1f77bcf86cd799439012" };
      (validateAccountUpdateInput as jest.Mock).mockReturnValue({
        error: validationError,
      });

      // Call controller
      await accountController.updateAccount(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      // Assertions
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Invalid status",
      });
      expect(accountService.updateAccount).not.toHaveBeenCalled();
    });

    it("should return 404 when account not found", async () => {
      // Setup mocks
      mockRequest.params = { id: "507f1f77bcf86cd799439012" };
      mockRequest.body = { name: "Updated Name" };
      (validateAccountUpdateInput as jest.Mock).mockReturnValue({
        error: null,
      });
      (accountService.updateAccount as jest.Mock).mockResolvedValue(null);

      // Call controller
      await accountController.updateAccount(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      // Assertions
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Account not found",
      });
    });

    it("should return 500 for unexpected errors", async () => {
      // Setup mocks
      mockRequest.params = { id: "507f1f77bcf86cd799439012" };
      mockRequest.body = { name: "Updated Name" };
      (validateAccountUpdateInput as jest.Mock).mockReturnValue({
        error: null,
      });
      (accountService.updateAccount as jest.Mock).mockRejectedValue(
        new Error("Database error")
      );

      // Call controller
      await accountController.updateAccount(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      // Assertions
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "An error occurred while updating the account.",
      });
    });
  });

  describe("closeAccount", () => {
    it("should close an account successfully", async () => {
      // Mock data
      const accountId = "507f1f77bcf86cd799439012";
      const serviceResponse = {
        _id: new mongoose.Types.ObjectId(accountId),
        userId: mockUser._id,
        status: AccountStatus.CLOSED,
        // Other account fields
      };

      // Setup mocks
      mockRequest.params = { id: accountId };
      (accountService.closeAccount as jest.Mock).mockResolvedValue(
        serviceResponse
      );

      // Call controller
      await accountController.closeAccount(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      // Assertions
      expect(mongoose.Types.ObjectId.isValid).toHaveBeenCalledWith(accountId);
      expect(accountService.closeAccount).toHaveBeenCalledWith(
        accountId,
        mockUser._id
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Account closed successfully",
        account: serviceResponse,
      });
    });

    it("should return 400 for invalid account ID format", async () => {
      // Setup mocks
      mockRequest.params = { id: "invalid-id" };
      (mongoose.Types.ObjectId.isValid as jest.Mock).mockReturnValue(false);

      // Call controller
      await accountController.closeAccount(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      // Assertions
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Invalid account ID format",
      });
      expect(accountService.closeAccount).not.toHaveBeenCalled();
    });

    it("should return 404 when account not found", async () => {
      // Setup mocks
      mockRequest.params = { id: "507f1f77bcf86cd799439012" };
      (accountService.closeAccount as jest.Mock).mockRejectedValue(
        new Error("Account not found")
      );

      // Call controller
      await accountController.closeAccount(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      // Assertions
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Account not found",
      });
    });

    it("should return 400 when account has non-zero balance", async () => {
      // Setup mocks
      mockRequest.params = { id: "507f1f77bcf86cd799439012" };
      (accountService.closeAccount as jest.Mock).mockRejectedValue(
        new Error("Account must have zero balance to be closed")
      );

      // Call controller
      await accountController.closeAccount(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      // Assertions
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Account must have zero balance to be closed",
      });
    });

    it("should return 500 for unexpected errors", async () => {
      // Setup mocks
      mockRequest.params = { id: "507f1f77bcf86cd799439012" };
      (accountService.closeAccount as jest.Mock).mockRejectedValue(
        new Error("Database error")
      );

      // Call controller
      await accountController.closeAccount(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      // Assertions
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "An error occurred while closing the account.",
      });
    });
  });
});
