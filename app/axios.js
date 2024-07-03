const axios = require("axios").default;

// Define your backend API base URL
const baseURL = process.env.API_URL;

// Create an Axios instance with baseURL configured
const axiosClient = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
    // Add any other headers if required
  },
});

module.exports = axiosClient;
