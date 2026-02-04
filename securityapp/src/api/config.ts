/**
 * Global API Configuration
 * Set ENABLE_API_CALLS to true to enable all API calls and use real backend data
 */
export const ENABLE_API_CALLS = true; // Enabled for local development

// Replace with your real Render URL, include the protocol
// Deployed backend URL: https://safetnet.onrender.com
// Local development URL: http://127.0.0.1:8000 (for local development)
// Using local backend for development
const BACKEND_BASE_URL = 'http://127.0.0.1:8000';

export default {
  BASE_URL: BACKEND_BASE_URL,
};