/**
 * Vercel serverless entry point.
 * All requests are rewritten to this function so the Express app can serve both API and static files.
 */
module.exports = require('../server');
