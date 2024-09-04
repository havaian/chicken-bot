const axios = require("axios").default;
const crypto = require('crypto');

// Define your backend API base URL
const baseURL = process.env.API_URL;

// Function to generate a simple hash
const generateHash = (login, password) => {
  return crypto.createHash('sha256').update(`${login}:${password}`).digest('hex');
};

// Create an Axios instance with baseURL configured
const axiosClient = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add interceptor to include auth headers
axiosClient.interceptors.request.use((config) => {
  const login = process.env.API_LOGIN;
  const password = process.env.API_PASSWORD;
  const authHash = generateHash(login, password);
  config.headers['X-Auth-Hash'] = authHash;
  return config;
});

module.exports = axiosClient;
