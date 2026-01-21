/**
 * Global API Configuration
 * Set ENABLE_API_CALLS to true to enable all API calls and use real backend data
 */
export const ENABLE_API_CALLS = true; // Set to true to enable API calls and use real backend data

// Replace with your real Render URL, include the protocol
// Deployed backend URL: https://safetnet-backend.onrender.com
// Local development URL: http://localhost:8000 (for emulator/simulator only)
// Using local server for development - switch to Render URL after deployment
const BACKEND_BASE_URL = 'https://safetnet.onrender.com';

export default {
  BASE_URL: BACKEND_BASE_URL,
};