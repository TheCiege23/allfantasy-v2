/**
 * Default env for Vitest so route handlers that read process.env do not 500
 * when keys are unset locally/CI. Uses `??=` so real env wins.
 */
process.env.NEXTAUTH_SECRET ??= "test-nextauth-secret-for-vitest"
process.env.OPENAI_API_KEY ??= "sk-mock-openai"
process.env.AI_INTEGRATIONS_OPENAI_API_KEY ??= process.env.OPENAI_API_KEY
process.env.ANTHROPIC_API_KEY ??= "sk-ant-mock"
process.env.STRIPE_SECRET_KEY ??= "sk_test_mock"
process.env.STRIPE_WEBHOOK_SECRET ??= "whsec_mock"
