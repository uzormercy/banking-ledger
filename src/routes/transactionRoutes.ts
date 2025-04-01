import { Router } from "express";
import transactionController from "../controllers/transactionController";
import { authenticate } from "../middleware/auth";

const router = Router();

// Apply authentication middleware to all transaction routes
router.use(authenticate);

/**
 * @route   POST /api/transactions/deposit
 * @desc    Process a deposit transaction
 * @access  Private
 */
router.post("/deposit", transactionController.deposit);

/**
 * @route   POST /api/transactions/withdraw
 * @desc    Process a withdrawal transaction
 * @access  Private
 */
router.post("/withdraw", transactionController.withdraw);

/**
 * @route   POST /api/transactions/transfer
 * @desc    Process a transfer transaction
 * @access  Private
 */
router.post("/transfer", transactionController.transfer);

/**
 * @route   GET /api/transactions
 * @desc    Get transactions with pagination and filtering
 * @access  Private
 */
router.get("/", transactionController.getTransactions);

/**
 * @route   GET /api/transactions/:id
 * @desc    Get transaction by ID
 * @access  Private
 */
router.get("/:id", transactionController.getTransaction);

/**
 * @route   GET /api/transactions/ledger/:accountId
 * @desc    Get ledger entries for an account
 * @access  Private
 */
router.get("/ledger/:accountId", transactionController.getLedgerEntries);

export default router;
