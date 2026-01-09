/**
 * Global API Configuration
 * Set ENABLE_API_CALLS to false to disable all API calls and use mock data instead
 */
export const ENABLE_API_CALLS = false; // Set to false to disable API calls and use mock data

// Replace with your real Render URL, include the protocol
// Deployed backend URL: https://safetnet.onrender.com
const BACKEND_BASE_URL = 'https://safetnet.onrender.com';

export default {
  BASE_URL: BACKEND_BASE_URL,
};