// Set test timeout (5 seconds)
jest.setTimeout(5000);

// Mock environment variables
process.env.JWT_SECRET = "test-secret-key";
process.env.NODE_ENV = "test";
// process.env.MONGODB_URI = "mongodb://localhost:27017/testdb";
