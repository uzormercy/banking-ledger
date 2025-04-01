import { Request, Response } from "express";
import authController from "../../../src/controllers/authController";
import authService from "../../../src/services/authService";
import {
  validateRegisterInput,
  validateLoginInput,
} from "../../../src/utils/validators";

// Mock dependencies
jest.mock("../../../src/services/authService");
jest.mock("../../../src/utils/validators");
jest.mock("../../../src/utils/logger");

describe("Auth Controller", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let responseObject: any = {};

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup request and response
    mockRequest = {
      body: {},
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
  });

  describe("register", () => {
    it("should register a user successfully", async () => {
      // Mock data
      const userData = {
        email: "test@example.com",
        password: "Password123",
        firstName: "Test",
        lastName: "User",
      };

      const serviceResponse = {
        user: {
          id: "507f1f77bcf86cd799439011",
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
        },
        token: "jwt-token",
      };

      // Setup mocks
      mockRequest.body = userData;
      (validateRegisterInput as jest.Mock).mockReturnValue({ error: null });
      (authService.registerUser as jest.Mock).mockResolvedValue(
        serviceResponse
      );

      // Call controller
      await authController.register(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assertions
      expect(validateRegisterInput).toHaveBeenCalledWith(userData);
      expect(authService.registerUser).toHaveBeenCalledWith(userData);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(serviceResponse);
      expect(responseObject.statusCode).toBe(201);
      expect(responseObject.jsonObject).toEqual(serviceResponse);
    });

    it("should return 400 if validation fails", async () => {
      // Mock validation error
      const validationError = { details: [{ message: "Email is required" }] };
      (validateRegisterInput as jest.Mock).mockReturnValue({
        error: validationError,
      });

      // Call controller
      await authController.register(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assertions
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Email is required",
      });
      expect(authService.registerUser).not.toHaveBeenCalled();
    });

    it("should return 409 if user already exists", async () => {
      // Setup mocks
      mockRequest.body = { email: "existing@example.com" };
      (validateRegisterInput as jest.Mock).mockReturnValue({ error: null });
      (authService.registerUser as jest.Mock).mockRejectedValue(
        new Error("User with this email already exists")
      );

      // Call controller
      await authController.register(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assertions
      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "User with this email already exists",
      });
    });

    it("should return 500 for unexpected errors", async () => {
      // Setup mocks
      mockRequest.body = { email: "test@example.com" };
      (validateRegisterInput as jest.Mock).mockReturnValue({ error: null });
      (authService.registerUser as jest.Mock).mockRejectedValue(
        new Error("Database error")
      );

      // Call controller
      await authController.register(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assertions
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "An error occurred during registration.",
      });
    });
  });

  describe("login", () => {
    it("should login a user successfully", async () => {
      // Mock data
      const loginData = {
        email: "test@example.com",
        password: "Password123",
      };

      const serviceResponse = {
        user: {
          id: "507f1f77bcf86cd799439011",
          email: loginData.email,
          firstName: "Test",
          lastName: "User",
        },
        token: "jwt-token",
      };

      // Setup mocks
      mockRequest.body = loginData;
      (validateLoginInput as jest.Mock).mockReturnValue({ error: null });
      (authService.loginUser as jest.Mock).mockResolvedValue(serviceResponse);

      // Call controller
      await authController.login(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assertions
      expect(validateLoginInput).toHaveBeenCalledWith(loginData);
      expect(authService.loginUser).toHaveBeenCalledWith(loginData);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(serviceResponse);
    });

    it("should return 400 if validation fails", async () => {
      // Mock validation error
      const validationError = { details: [{ message: "Email is required" }] };
      (validateLoginInput as jest.Mock).mockReturnValue({
        error: validationError,
      });

      // Call controller
      await authController.login(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assertions
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Email is required",
      });
      expect(authService.loginUser).not.toHaveBeenCalled();
    });

    it("should return 401 for invalid credentials", async () => {
      // Setup mocks
      mockRequest.body = { email: "test@example.com", password: "wrong" };
      (validateLoginInput as jest.Mock).mockReturnValue({ error: null });
      (authService.loginUser as jest.Mock).mockRejectedValue(
        new Error("Invalid email or password")
      );

      // Call controller
      await authController.login(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assertions
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Invalid email or password",
      });
    });

    it("should return 500 for unexpected errors", async () => {
      // Setup mocks
      mockRequest.body = { email: "test@example.com", password: "Password123" };
      (validateLoginInput as jest.Mock).mockReturnValue({ error: null });
      (authService.loginUser as jest.Mock).mockRejectedValue(
        new Error("Database error")
      );

      // Call controller
      await authController.login(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assertions
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "An error occurred during login.",
      });
    });
  });
});
