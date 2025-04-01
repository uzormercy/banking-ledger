import { v4 as uuid } from "uuid";
import Account from "../models/account";

/**
 * Generate a unique account number
 */
export const generateAccountNumber = async (): Promise<string> => {
  let isUnique = false;
  let accountNumber = "";

  while (!isUnique) {
    // Generate a random 10-digit number
    accountNumber = Math.floor(Math.random() * 9000000000) + 1000000000 + "";

    // Check if it already exists
    const existingAccount = await Account.findOne({ accountNumber });

    if (!existingAccount) {
      isUnique = true;
    }
  }

  return accountNumber;
};

/**
 * Generate a unique transaction ID
 */
export const generateTransactionId = (): string => {
  return uuid();
};

/**
 * Format amount for display (e.g., 1000 -> 1,000.00)
 */
export const formatAmount = (amount: number): string => {
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

/**
 * Calculate pagination metadata
 */
export const getPaginationMetadata = (
  page: number,
  limit: number,
  total: number
) => {
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage,
    hasPrevPage,
  };
};
