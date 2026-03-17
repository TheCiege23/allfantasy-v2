/**
 * CSS selectors and data-testid values for auth-related elements.
 * Use these constants in tests to keep selectors maintainable.
 */

// Signup form
export const SIGNUP = {
  email: '[data-testid="signup-email"]',
  username: '[data-testid="signup-username"]',
  password: '[data-testid="signup-password"]',
  displayName: '[data-testid="signup-display-name"]',
  phone: '[data-testid="signup-phone"]',
  sleeperUsername: '[data-testid="signup-sleeper-username"]',
  ageConfirm: '[data-testid="signup-age-confirm"]',
  submit: '[data-testid="signup-submit"]',
  error: '[data-testid="signup-error"]',
} as const

// Signin form
export const SIGNIN = {
  login: '[data-testid="signin-login"]',
  password: '[data-testid="signin-password"]',
  submit: '[data-testid="signin-submit"]',
  error: '[data-testid="signin-error"]',
} as const

// Navigation
export const NAV = {
  userMenu: '[data-testid="navbar-user-menu"]',
  logout: '[data-testid="navbar-logout"]',
} as const

// Forgot password form
export const FORGOT_PASSWORD = {
  email: '[data-testid="forgot-password-email"]',
  submit: '[data-testid="forgot-password-submit"]',
} as const

// Reset password form
export const RESET_PASSWORD = {
  newPassword: '[data-testid="reset-password-new"]',
  confirmPassword: '[data-testid="reset-password-confirm"]',
  submit: '[data-testid="reset-password-submit"]',
  error: '[data-testid="reset-password-error"]',
} as const
