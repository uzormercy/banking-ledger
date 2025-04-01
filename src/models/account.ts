import mongoose, { Document, Schema } from "mongoose";

export enum AccountType {
  ASSET = "ASSET", // Debit increases, Credit decreases (e.g., Customer accounts)
  LIABILITY = "LIABILITY", // Credit increases, Debit decreases (e.g., Bank's obligation)
  EQUITY = "EQUITY", // Credit increases, Debit decreases (Owner's equity)
  REVENUE = "REVENUE", // Credit increases, Debit decreases (Income)
  EXPENSE = "EXPENSE", // Debit increases, Credit decreases (Costs)
}

export enum AccountStatus {
  ACTIVE = "ACTIVE",
  FROZEN = "FROZEN",
  CLOSED = "CLOSED",
}

export interface IAccount extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  accountNumber: string;
  name: string;
  type: AccountType;
  currency: string;
  balance: number;
  availableBalance: number;
  status: AccountStatus;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const AccountSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    accountNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: Object.values(AccountType),
      required: true,
    },
    currency: {
      type: String,
      required: true,
      default: "USD",
      uppercase: true,
      trim: true,
    },
    balance: {
      type: Number,
      required: true,
      default: 0,
    },
    availableBalance: {
      type: Number,
      required: true,
      default: 0,
    },
    status: {
      type: String,
      enum: Object.values(AccountStatus),
      default: AccountStatus.ACTIVE,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Create compound index for better query performance
AccountSchema.index({ userId: 1, currency: 1 });
AccountSchema.index({ userId: 1, status: 1 });

export default mongoose.model<IAccount>("Account", AccountSchema);
