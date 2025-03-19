const axios = require("axios");
const { wrapper } = require("axios-cookiejar-support");
const { CookieJar } = require("tough-cookie");
const winston = require("winston");
const mongoose = require("mongoose");

// Cookie handling
const cookieJar = new CookieJar();
const client = wrapper(axios.create({ jar: cookieJar }));

// Logging
const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  transports: [new winston.transports.File({ filename: "test-results.log" })],
});

// Test data
const BASE_URL = "http://localhost:3000";
const TEST_USERS = [
  {
    name: "Customer1",
    email: "customer1@test.com",
    password: "password123",
    role: "customer",
  },
  {
    name: "Provider1",
    email: "provider1@test.com",
    password: "password123",
    role: "provider",
    skills: "JavaScript,Node.js",
    location: "New York",
  },
];

// Database connection
mongoose.connect("mongodb://localhost:27017/itechies");

// Test functions
async function registerUser(user) {
  try {
    const response = await client.post(`${BASE_URL}/register`, user);
    logger.info(`Registration successful: ${user.email}`);
  } catch (error) {
    logger.error(
      `Registration failed: ${error.response?.data?.error || error.message}`
    );
  }
}

async function loginUser(user) {
  try {
    const response = await client.post(`${BASE_URL}/login`, user);
    logger.info(`Login successful: ${user.email}`);
    return response.headers["set-cookie"].join("; ");
  } catch (error) {
    logger.error(
      `Login failed: ${error.response?.data?.error || error.message}`
    );
  }
}

async function createServiceRequest(cookie, description) {
  try {
    const response = await client.post(
      `${BASE_URL}/api/service-requests`,
      { description },
      { headers: { Cookie: cookie } }
    );
    logger.info(`Service request created: ${response.data._id}`);
    return response.data._id;
  } catch (error) {
    logger.error(
      `Request creation failed: ${error.response?.data?.error || error.message}`
    );
  }
}

async function acceptServiceRequest(cookie, requestId) {
  try {
    const response = await client.put(
      `${BASE_URL}/api/service-requests/${requestId}/accept`,
      {},
      { headers: { Cookie: cookie } }
    );
    logger.info(`Request accepted: ${requestId}`);
  } catch (error) {
    logger.error(
      `Acceptance failed: ${error.response?.data?.error || error.message}`
    );
  }
}

// Test sequence
async function runTests() {
  try {
    await mongoose.connection.dropDatabase();

    // Register users
    await registerUser(TEST_USERS[0]);
    await registerUser(TEST_USERS[1]);

    // Login users
    const customerCookie = await loginUser({
      email: TEST_USERS[0].email,
      password: TEST_USERS[0].password,
    });

    const providerCookie = await loginUser({
      email: TEST_USERS[1].email,
      password: TEST_USERS[1].password,
    });

    // Service request flow
    const requestId = await createServiceRequest(
      customerCookie,
      "Need help with Node.js"
    );

    if (requestId) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await acceptServiceRequest(providerCookie, requestId);
    }

    logger.info("All tests completed!");
  } catch (error) {
    logger.error(`Test failed: ${error.message}`);
  } finally {
    mongoose.connection.close();
  }
}

// Execute tests
runTests();
