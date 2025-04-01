import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import authService from "../../../src/services/authService";
import User from "../../../src/models/user";
import jwt from "jsonwebtoken";

let mongoServer: MongoMemoryServer;

// Mock JWT secret for tests
const JWT_SECRET = "test-secret-key";
process.env.JWT_SECRET = JWT_SECRET;

beforeAll(async () => {
  // Create in-memory MongoDB server
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();

  // Connect to the in-memory database
  await mongoose.connect(uri);
});

afterAll(async () => {
  // Disconnect from the database
  await mongoose.disconnect();

  // Stop in-memory MongoDB server
  await mongoServer.stop();
});

beforeEach(async () => {
  // Clear users collection before each test
  await User.deleteMany({});
});

describe("Auth Service", () => {
  describe("registerUser", () => {
    it("should register a new user successfully", async () => {
      const userData = {
        email: "test@example.com",
        password: "Password123",
        firstName: "Test",
        lastName: "User",
      };

      const result = await authService.registerUser(userData);

      // Check user data
      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(userData.email);
      expect(result.user.firstName).toBe(userData.firstName);
      expect(result.user.lastName).toBe(userData.lastName);

      // Check token
      expect(result.token).toBeDefined();

      // Verify token
      const decoded = jwt.verify(result.token, JWT_SECRET) as {
        id: string;
        email: string;
      };
      expect(decoded.email).toBe(userData.email);

      // Check if user is saved in database
      const user = await User.findById(result.user.id);
      expect(user).toBeDefined();
      expect(user?.email).toBe(userData.email);

      // Password should be hashed
      expect(user?.password).not.toBe(userData.password);
    });

    it("should throw an error when email already exists", async () => {
      const userData = {
        email: "duplicate@example.com",
        password: "Password123",
        firstName: "Test",
        lastName: "User",
      };

      // Create the user first
      await authService.registerUser(userData);

      // Try to create again with the same email
      await expect(authService.registerUser(userData)).rejects.toThrow(
        "User with this email already exists"
      );
    });
  });

  describe("loginUser", () => {
    it("should login user successfully with valid credentials", async () => {
      // First register a user
      const userData = {
        email: "login@example.com",
        password: "Password123",
        firstName: "Login",
        lastName: "Test",
      };

      await authService.registerUser(userData);

      // Now try to login
      const loginResult = await authService.loginUser({
        email: userData.email,
        password: userData.password,
      });

      // Check login result
      expect(loginResult.user).toBeDefined();
      expect(loginResult.user.email).toBe(userData.email);
      expect(loginResult.token).toBeDefined();

      // Verify token
      const decoded = jwt.verify(loginResult.token, JWT_SECRET) as {
        id: string;
        email: string;
      };
      expect(decoded.email).toBe(userData.email);
    });

    it("should throw an error with wrong password", async () => {
      // First register a user
      const userData = {
        email: "wrong@example.com",
        password: "Password123",
        firstName: "Wrong",
        lastName: "Password",
      };

      await authService.registerUser(userData);

      // Try to login with wrong password
      await expect(
        authService.loginUser({
          email: userData.email,
          password: "WrongPassword",
        })
      ).rejects.toThrow("Invalid email or password");
    });

    it("should throw an error with non-existent email", async () => {
      // Try to login with non-existent email
      await expect(
        authService.loginUser({
          email: "nonexistent@example.com",
          password: "Password123",
        })
      ).rejects.toThrow("Invalid email or password");
    });
  });

  describe("edge cases", () => {
    it("should handle case-insensitive email login", async () => {
      // Register with lowercase email
      const userData = {
        email: "case@example.com",
        password: "Password123",
        firstName: "Case",
        lastName: "Insensitive",
      };

      await authService.registerUser(userData);

      // Try to login with uppercase email
      const loginResult = await authService.loginUser({
        email: "CASE@example.com",
        password: "Password123",
      });

      // Check login result
      expect(loginResult.user).toBeDefined();
      expect(loginResult.user.email).toBe(userData.email); // Should be stored as lowercase
    });

    it("should validate password complexity", async () => {
      const userData = {
        email: "password@example.com",
        password: "short", // Too short
        firstName: "Password",
        lastName: "Complexity",
      };

      // This is assuming the password validation is done in the controller level via Joi
      // If it's in the model, this test would need to be adjusted

      // Create user in database directly without validation
      const user = new User(userData);

      // Check that save throws an error due to password length
      await expect(user.save()).rejects.toThrow();
    });

    it("should correctly compare passwords after rehashing", async () => {
      // Register a user
      const userData = {
        email: "hash@example.com",
        password: "Password123",
        firstName: "Hash",
        lastName: "Compare",
      };

      await authService.registerUser(userData);

      // Get the user directly from database
      const user = await User.findOne({ email: userData.email });
      expect(user).toBeDefined();

      // Manually call the comparePassword method
      const isMatch = await user!.comparePassword(userData.password);
      expect(isMatch).toBe(true);

      // Try with wrong password
      const isNotMatch = await user!.comparePassword("WrongPassword");
      expect(isNotMatch).toBe(false);
    });

    it("should generate unique tokens for different users", async () => {
      // Register first user
      const userData1 = {
        email: "user1@example.com",
        password: "Password123",
        firstName: "User",
        lastName: "One",
      };

      const result1 = await authService.registerUser(userData1);

      // Register second user
      const userData2 = {
        email: "user2@example.com",
        password: "Password123",
        firstName: "User",
        lastName: "Two",
      };

      const result2 = await authService.registerUser(userData2);

      // Tokens should be different
      expect(result1.token).not.toBe(result2.token);

      // Decode tokens and check user info
      const decoded1 = jwt.verify(result1.token, JWT_SECRET) as {
        id: string;
        email: string;
      };
      const decoded2 = jwt.verify(result2.token, JWT_SECRET) as {
        id: string;
        email: string;
      };

      expect(decoded1.email).toBe(userData1.email);
      expect(decoded2.email).toBe(userData2.email);
      expect(decoded1.id).not.toBe(decoded2.id);
    });
  });
});
