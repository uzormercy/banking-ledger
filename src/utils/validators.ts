import Joi from "joi";
import { AccountType, AccountStatus } from "../models/account";
import { TransactionType } from "../models/transaction";

// Register validation schema
export const validateRegisterInput = (data: any) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
  });

  return schema.validate(data);
};

// Login validation schema
export const validateLoginInput = (data: any) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  });

  return schema.validate(data);
};

// Account creation validation schema
export const validateAccountInput = (data: any) => {
  const schema = Joi.object({
    name: Joi.string().required(),
    type: Joi.string()
      .valid(...Object.values(AccountType))
      .required(),
    currency: Joi.string().length(3).uppercase().required(),
    initialBalance: Joi.number().min(0).default(0),
    metadata: Joi.object().optional(),
  });

  return schema.validate(data);
};

// Account update validation schema
export const validateAccountUpdateInput = (data: any) => {
  const schema = Joi.object({
    name: Joi.string().optional(),
    status: Joi.string()
      .valid(...Object.values(AccountStatus))
      .optional(),
    metadata: Joi.object().optional(),
  });

  return schema.validate(data);
};

// Deposit validation schema
export const validateDepositInput = (data: any) => {
  const schema = Joi.object({
    accountId: Joi.string().required(),
    amount: Joi.number().positive().required(),
    currency: Joi.string().length(3).uppercase().required(),
    description: Joi.string().required(),
    metadata: Joi.object().optional(),
  });

  return schema.validate(data);
};

// Withdrawal validation schema
export const validateWithdrawalInput = (data: any) => {
  const schema = Joi.object({
    accountId: Joi.string().required(),
    amount: Joi.number().positive().required(),
    currency: Joi.string().length(3).uppercase().required(),
    description: Joi.string().required(),
    metadata: Joi.object().optional(),
  });

  return schema.validate(data);
};

// Transfer validation schema
export const validateTransferInput = (data: any) => {
  const schema = Joi.object({
    sourceAccountId: Joi.string().required(),
    destinationAccountId: Joi.string().required(),
    amount: Joi.number().positive().required(),
    currency: Joi.string().length(3).uppercase().required(),
    description: Joi.string().required(),
    metadata: Joi.object().optional(),
  }).custom((value, helpers) => {
    if (value.sourceAccountId === value.destinationAccountId) {
      return helpers.error("any.invalid", {
        message: "Source and destination accounts cannot be the same",
      });
    }
    return value;
  });

  return schema.validate(data);
};

// Transaction query validation schema
export const validateTransactionQueryInput = (data: any) => {
  const schema = Joi.object({
    accountId: Joi.string().optional(),
    type: Joi.string()
      .valid(...Object.values(TransactionType))
      .optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().min(Joi.ref("startDate")).optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  });

  return schema.validate(data);
};
