import { Router } from "express";
import accountController from "../controllers/accountController";
import { authenticate } from "../middleware/auth";

const router = Router();

// Apply authentication middleware to all account routes
router.use(authenticate);

/**
 * @route   POST /api/accounts
 * @desc    Create a new account
 * @access  Private
 */
router.post("/", accountController.createAccount);

/**
 * @route   GET /api/accounts
 * @desc    Get all accounts for current user
 * @access  Private
 */
router.get("/", accountController.getUserAccounts);

/**
 * @route   GET /api/accounts/:id
 * @desc    Get account by ID
 * @access  Private
 */
router.get("/:id", accountController.getAccount);

/**
 * @route   PUT /api/accounts/:id
 * @desc    Update account details
 * @access  Private
 */
router.put("/:id", accountController.updateAccount);

/**
 * @route   DELETE /api/accounts/:id
 * @desc    Close account
 * @access  Private
 */
router.delete("/:id", accountController.closeAccount);

export default router;
