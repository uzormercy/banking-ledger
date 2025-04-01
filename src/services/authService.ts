import jwt from "jsonwebtoken";
import User, { IUser } from "../models/user";
import { logger } from "../utils/logger";

export interface RegisterUserInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  token: string;
}

class AuthService {
  /**
   * Register a new user
   */
  async registerUser(userData: RegisterUserInput): Promise<AuthResponse> {
    try {
      // Check if user already exists
      const existingUser = await User.findOne({ email: userData.email });
      if (existingUser) {
        throw new Error("User with this email already exists");
      }

      // Create new user
      const user: IUser = new User(userData);
      await user.save();

      // Generate token
      const token = this.generateToken(user);

      return {
        user: {
          id: user._id.toString(),
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        },
        token,
      };
    } catch (error) {
      logger.error("Error registering user:", error);
      throw error;
    }
  }

  /**
   * Login a user
   */
  async loginUser(loginData: LoginInput): Promise<AuthResponse> {
    try {
      // Find user by email
      const user = (await User.findOne({ email: loginData.email })) as IUser;
      if (!user) {
        throw new Error("Invalid email or password");
      }

      // Verify password
      const isMatch = await user.comparePassword(loginData.password);
      if (!isMatch) {
        throw new Error("Invalid email or password");
      }

      // Generate token
      const token = this.generateToken(user);

      return {
        user: {
          id: user._id.toString(),
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        },
        token,
      };
    } catch (error) {
      logger.error("Error logging in user:", error);
      throw error;
    }
  }

  /**
   * Generate JWT token
   */
  private generateToken(user: IUser): string {
    const payload = {
      id: user._id,
      email: user.email,
    };

    return jwt.sign(payload, process.env.JWT_SECRET || "your-secret-key", {
      expiresIn: "1d",
    });
  }
}

export default new AuthService();
