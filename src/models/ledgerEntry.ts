import mongoose, { Document, Schema } from "mongoose";

export enum EntryType {
  DEBIT = "DEBIT", // Increase assets/expenses, decrease liabilities/equity/revenue
  CREDIT = "CREDIT", // Decrease assets/expenses, increase liabilities/equity/revenue
}

export interface ILedgerEntry extends Document {
  transactionId: mongoose.Types.ObjectId;
  accountId: mongoose.Types.ObjectId;
  type: EntryType;
  amount: number;
  currency: string;
  balance: number; // Account balance after this entry
  description: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

const LedgerEntrySchema = new Schema(
  {
    transactionId: {
      type: Schema.Types.ObjectId,
      ref: "Transaction",
      required: true,
      index: true,
    },
    accountId: {
      type: Schema.Types.ObjectId,
      ref: "Account",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(EntryType),
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    currency: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    balance: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      required: true,
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

// Create compound indexes for efficient querying
LedgerEntrySchema.index({ accountId: 1, createdAt: -1 });
LedgerEntrySchema.index({ transactionId: 1, accountId: 1 });

export default mongoose.model<ILedgerEntry>("LedgerEntry", LedgerEntrySchema);
