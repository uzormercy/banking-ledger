# Banking Ledger System API

A robust banking ledger system that handles financial transactions with ACID compliance and double-entry accounting using MongoDB transactions.

## Features

- **Account Management**

  - Create and manage user accounts
  - Track account balances
  - Support multiple currencies
  - Maintain transaction history

- **Transaction Operations**

  - Handle deposits
  - Process withdrawals
  - Support account-to-account transfers
  - Ensure double-entry accounting

- **Technical Implementation**
  - ACID-compliant transactions using MongoDB
  - Token-based authentication with JWT
  - Modular architecture with separation of concerns
  - Comprehensive error handling

## Technology Stack

- **Node.js** - JavaScript runtime
- **Express** - Web application framework
- **TypeScript** - Statically typed JavaScript
- **MongoDB** - NoSQL database with transaction support
- **Mongoose** - MongoDB object modeling
- **JWT** - JSON Web Tokens for authentication
- **Jest** - Testing framework
- **Docker** - Containerization

## Project Structure

```
banking-ledger-api/
├── src/
│   ├── config/                  # Configuration files
│   ├── controllers/             # Request handlers
│   ├── middleware/              # Middleware functions
│   ├── models/                  # Database models
│   ├── routes/                  # API routes
│   ├── services/                # Business logic
│   ├── types/                   # Type definitions
│   ├── utils/                   # Utility functions
│   ├── app.ts                   # Express app setup
│   └── server.ts                # Entry point
├── tests/                       # Test files
│   ├── unit/
│   └── integration/
```

## Double-Entry Accounting

The system implements double-entry accounting principles:

- Every transaction affects at least two accounts
- The sum of debits must equal the sum of credits for each transaction
- Each account maintains a balance that is updated atomically during transactions

Examples:

- **Deposit**: DEBIT user account (asset ↑), CREDIT bank liability account (liability ↑)
- **Withdrawal**: CREDIT user account (asset ↓), DEBIT bank liability account (liability ↓)
- **Transfer**: CREDIT source account (asset ↓), DEBIT destination account (asset ↑)

## ACID Compliance

Transactions in the system are:

- **Atomic**: All operations within a transaction either complete or fail together
- **Consistent**: The database moves from one valid state to another
- **Isolated**: Concurrent transactions don't interfere with each other
- **Durable**: Once committed, transactions persist even during system failures

Implementation is achieved using MongoDB's multi-document transactions.

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.0 or higher with replica set for transaction support)
- npm or yarn

### Installation

1. Clone the repository

   ```
   git clone https://github.com/uzormercy/banking-ledger.git
   cd banking-ledger
   ```

2. Install dependencies

   ```
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:

   ```
   NODE_ENV=development
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/banking-ledger
   JWT_SECRET=your-secret-key
   ```

4. Start the development server
   ```
   npm run dev
   ```

### Using Docker

Alternatively, you can use Docker to run the application:

```
docker-compose up
```

## API Documentation

### Authentication Endpoints

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login and get authentication token

### Account Endpoints

- `POST /api/accounts` - Create a new account
- `GET /api/accounts` - Get all accounts for current user
- `GET /api/accounts/:id` - Get account by ID
- `PUT /api/accounts/:id` - Update account details
- `DELETE /api/accounts/:id` - Close account

### Transaction Endpoints

- `POST /api/transactions/deposit` - Make a deposit
- `POST /api/transactions/withdraw` - Make a withdrawal
- `POST /api/transactions/transfer` - Transfer between accounts
- `GET /api/transactions` - Get transactions with filters
- `GET /api/transactions/:id` - Get transaction by ID
- `GET /api/transactions/ledger/:accountId` - Get ledger entries for an account

## Testing

Run the test suite with:

```
npm test
```

For test coverage:

```
npm run test:coverage
```

## License

This project is licensed under the MIT License.
