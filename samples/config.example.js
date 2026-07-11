/**
 * Example config — secrets are read from environment variables, never committed.
 * Copy to config.js locally (config.js is gitignored).
 */
module.exports = {
  JWT_SECRET: process.env.JWT_SECRET,
  MP_ACCESS_TOKEN: process.env.MP_ACCESS_TOKEN,
  MP_WEBHOOK_SECRET: process.env.MP_WEBHOOK_SECRET,
  PLATFORM_FEE_PCT: Number(process.env.PLATFORM_FEE_PCT || 0.05),
  PRESCRIPTION_PROVIDER: process.env.PRESCRIPTION_PROVIDER || 'A',
  providerA: { baseUrl: process.env.PROVIDER_A_URL, apiKey: process.env.PROVIDER_A_KEY },
  providerB: { baseUrl: process.env.PROVIDER_B_URL, token: process.env.PROVIDER_B_TOKEN },
};
