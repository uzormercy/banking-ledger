import mongoose, { Document, Schema } from "mongoose";

export enum TransactionType {
  DEPOSIT = "DEPOSIT",
  WITHDRAWAL = "WITHDRAWAL",
  TRANSFER = "TRANSFER",
  FEE = "FEE",
  ADJUSTMENT = "ADJUSTMENT",
}

export enum TransactionStatus {
  PENDING = "PENDING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  CANCELLED = "CANCELLED",
}

export interface ITransaction extends Document {
  _id: mongoose.Types.ObjectId;
  transactionId: string;
  userId: mongoose.Types.ObjectId;
  type: TransactionType;
  amount: number;
  currency: string;
  sourceAccountId?: mongoose.Types.ObjectId;
  destinationAccountId?: mongoose.Types.ObjectId;
  description: string;
  status: TransactionStatus;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    transactionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(TransactionType),
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
    sourceAccountId: {
      type: Schema.Types.ObjectId,
      ref: "Account",
      index: true,
    },
    destinationAccountId: {
      type: Schema.Types.ObjectId,
      ref: "Account",
      index: true,
    },
    description: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(TransactionStatus),
      default: TransactionStatus.PENDING,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Create indexes for efficient querying
TransactionSchema.index({ userId: 1, status: 1 });
TransactionSchema.index({ sourceAccountId: 1, createdAt: -1 });
TransactionSchema.index({ destinationAccountId: 1, createdAt: -1 });
TransactionSchema.index({ createdAt: -1 });

export default mongoose.model<ITransaction>("Transaction", TransactionSchema);
